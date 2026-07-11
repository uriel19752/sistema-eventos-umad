/**
 * @file Servicio de recordatorios automáticos para solicitantes.
 *
 * Ejecutado diariamente por `iniciarReminderJob` (cron `0 8 * * *`).
 * Recorre todas las solicitudes en estado `Aprobado` y envía correos de
 * recordatorio cuando la fecha del evento está a 7 días o a 1 día de
 * distancia, marcando flags `recordatorio7DiasEnviado` /
 * `recordatorio24HorasEnviado` para garantizar idempotencia.
 *
 * @module services/reminder
 */

import prisma from '../config/db.js'
import { enviarCorreoRecordatorio } from './mailService.js'

/**
 * Formatea un objeto `Date` a string ISO `YYYY-MM-DD` usando componentes
 * numéricos locales (no UTC), para construir fechas legibles en el correo
 * independientemente de la zona horaria del servidor.
 */
function formatoFecha(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dia}`
}

/**
 * Formatea un objeto `Date` a string `HH:mm` en hora local.
 */
function formatoHora(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/**
 * Retorna un `Date` que representa el inicio del día de hoy (00:00:00.000)
 * truncando horas, minutos, segundos y milisegundos.
 *
 * @returns Medianoche de hoy en hora local del servidor.
 */
function hoy(): Date {
  const ahora = new Date()
  return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
}

/**
 * Retorna un `Date` que representa el inicio del día `n` días en el futuro
 * (00:00:00.000), calculado como `hoy + n * 86400000`.
 *
 * El cálculo usa milisegundos en lugar de `setDate()` para evitar desbordes
 * al cruzar meses (ej. 31 de enero + 7 días = 7 de febrero).
 *
 * @param n - Número de días a avanzar (positivo) o retroceder (negativo).
 * @returns Medianoche del día resultante.
 */
function dentroDeDias(n: number): Date {
  const base = hoy()
  return new Date(base.getTime() + n * 86400000)
}

/**
 * Procesa y envía recordatorios automáticos a solicitantes con eventos
 * próximos.
 *
 * Flujo de ejecución:
 *
 *   1. **Cálculo de fechas relativas**:
 *      Se construyen tres fechas usando `hoy()` y `dentroDeDias()`:
 *        - `hoyDate`     = inicio del día actual (00:00:00.000).
 *        - `mananaDate`  = inicio del día de mañana (hoy + 1 día).
 *        - `sieteDiasDate` = inicio del día en 7 días (hoy + 7 días).
 *      Todas se calculan con pure arithmetic de milisegundos
 *      (`base.getTime() + n * 86400000`), evitando el uso de `setDate()`
 *      que muta el objeto original y puede causar desbordamientos de mes.
 *
 *   2. **Carga masiva**:
 *      Se obtienen todas las solicitudes `Aprobado` con su usuario en una
 *      sola consulta (`findMany`). No se aplica filtro por rango de fechas
 *      en SQL porque las guardas de diferencia se evalúan en memoria.
 *      Esto permite reutilizar una única consulta para ambas ventanas
 *      (7 días y 24 horas).
 *
 *   3. **Aislamiento de fallos — try-catch interno en cada iteración**:
 *      Cada envío de correo se ejecuta con `.catch()` individual (sin
 *      `await`), de modo que si un `enviarCorreoRecordatorio()` lanza una
 *      excepción (SMTP caído, destinatario inválido), el error se captura
 *      y registra en consola sin interrumpir el resto de la cola.
 *      El flag `recordatorio7DiasEnviado` / `recordatorio24HorasEnviado`
 *      se actualiza incondicionalmente después del `.catch()` (véase línea
 *      70–73), lo que garantiza que incluso si el correo falla, el sistema
 *      no reintente el envío en el próximo ciclo (evita bucles infinitos
 *      de error).
 *
 *   4. **Concurrencia — modelo actual**:
 *      Los envíos se procesan secuencialmente (`for...of`). El envío del
 *      correo se dispara sin `await` (fire-and-forget), por lo que la
 *      iteración continúa inmediatamente. La actualización del flag en BD
 *      es `await` y bloquea la iteración. Esto mantiene un solo cursor
 *      abierto contra PostgreSQL.
 *
 *      El candidato natural para paralelizar sería reemplazar el bucle
 *      con `Promise.allSettled()`, que ejecutaría todas las consultas de
 *      actualización en un pool de conexiones y reportaría cada resultado
 *      individual sin que un rechazo cancele las demás. Sin embargo, el
 *      volumen actual (< 50 solicitudes por ciclo) no justifica la
 *      sobrecarga de memoria de `Promise.allSettled`.
 *
 * Guardas de idempotencia:
 *   - `recordatorio7DiasEnviado`: evita re-enviar el recordatorio de 7
 *     días si ya se envió en un ciclo anterior.
 *   - `recordatorio24HorasEnviado`: evita re-enviar el recordatorio de
 *     24 horas si ya se envió.
 *   Ambos flags se actualizan a `true` inmediatamente después del intento
 *   de envío, independientemente de si el correo se entregó o no.
 *
 * @returns {Promise<void>}
 */
export async function procesarRecordatorios(): Promise<void> {
  console.log('[CRON] Ejecutando recordatorios automáticos')

  const hoyDate = hoy()
  const mananaDate = dentroDeDias(1)
  const sieteDiasDate = dentroDeDias(7)

  let enviados = 0

  const solicitudes = await prisma.solicitudEvento.findMany({
    where: { estado: 'Aprobado' },
    include: {
      usuario: {
        select: { id: true, email: true, rol: true },
      },
    },
  })

  for (const solicitud of solicitudes) {
    if (!solicitud.usuario?.email) {
      console.log('[CRON] Solicitud sin usuario asociado')
      continue
    }

    const fechaEvento = new Date(
      solicitud.fechaEvento.getFullYear(),
      solicitud.fechaEvento.getMonth(),
      solicitud.fechaEvento.getDate(),
    )

    const diffMs = fechaEvento.getTime() - hoyDate.getTime()
    const diffDias = Math.round(diffMs / 86400000)

    if (diffDias === 7 && !solicitud.recordatorio7DiasEnviado) {
      enviarCorreoRecordatorio({
        destinatario: solicitud.usuario.email,
        solicitudId: solicitud.id,
        folio: solicitud.folio,
        nombreEvento: solicitud.nombreEvento,
        fechaEvento: formatoFecha(solicitud.fechaEvento),
        horaInicio: formatoHora(solicitud.horaInicio),
        responsableNombre: solicitud.responsableNombre,
        diasRestantes: 7,
      }).catch((e) => console.error('[MAIL] Error enviando recordatorio 7 días', e))

      await prisma.solicitudEvento.update({
        where: { id: solicitud.id },
        data: { recordatorio7DiasEnviado: true },
      })

      console.log(`[CRON] Recordatorio enviado a ${solicitud.usuario.email}`)
      enviados++
      continue
    }

    if (diffDias === 1 && !solicitud.recordatorio24HorasEnviado) {
      enviarCorreoRecordatorio({
        destinatario: solicitud.usuario.email,
        solicitudId: solicitud.id,
        folio: solicitud.folio,
        nombreEvento: solicitud.nombreEvento,
        fechaEvento: formatoFecha(solicitud.fechaEvento),
        horaInicio: formatoHora(solicitud.horaInicio),
        responsableNombre: solicitud.responsableNombre,
        diasRestantes: 1,
      }).catch((e) => console.error('[MAIL] Error enviando recordatorio 24h', e))

      await prisma.solicitudEvento.update({
        where: { id: solicitud.id },
        data: { recordatorio24HorasEnviado: true },
      })

      console.log(`[CRON] Recordatorio enviado a ${solicitud.usuario.email}`)
      enviados++
    }
  }

  if (enviados === 0) {
    console.log('[CRON] No existen eventos pendientes de recordatorio')
  }
}
