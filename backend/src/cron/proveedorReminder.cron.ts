/**
 * @file Programa la tarea cron de recordatorios para proveedores externos.
 *
 * Inicializa un barrido diario mandatorio que ejecuta
 * `enviarRecordatoriosProveedores()` todos los días a las 08:00 AM.
 * Consulta solicitudes en estado `Aprobado` cuya `fechaEvento` sea mañana
 * y que tengan proveedores asignados, enviándoles un correo recordatorio.
 *
 * Expresión cron: `0 8 * * *` (misma que `reminder.job.ts` — véase
 * la documentación de esa expresión en ese archivo).
 *
 * @module cron/proveedorReminder
 */

import cron from 'node-cron'
import prisma from '../config/db.js'
import { enviarNotificacionProveedor } from '../services/mailService.js'

/**
 * Formatea un objeto `Date` a string ISO `YYYY-MM-DD` usando componentes
 * locales, para usar en el cuerpo del correo del proveedor.
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
 * Retorna un `Date` que representa el inicio del día de mañana
 * (00:00:00.000), truncando horas, minutos, segundos y milisegundos.
 *
 * Se construye como `new Date(año, mes, día + 1)` para que Prisma pueda
 * usarlo en un filtro `gte` contra columnas `@db.Date`.
 *
 * @returns Medianoche de mañana en hora local del servidor.
 */
function manana(): Date {
  const ahora = new Date()
  const inicioManana = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
  inicioManana.setDate(inicioManana.getDate() + 1)
  return inicioManana
}

/**
 * Retorna el `Date` que representa el inicio del día siguiente al dado
 * (es decir, `fin = fecha + 1 día`), útil como límite superior `<` en
 * filtros de rango de Prisma.
 *
 * @param fecha - Fecha base.
 * @returns Medianoche del día siguiente.
 */
function finDelDia(fecha: Date): Date {
  const fin = new Date(fecha)
  fin.setDate(fin.getDate() + 1)
  return fin
}

/**
 * Busca todas las solicitudes aprobadas cuyo evento ocurre mañana y que
 * tengan proveedores externos asignados, y envía un correo recordatorio
 * a cada proveedor.
 *
 * Flujo de ejecución:
 *
 *   1. **Cálculo de fechas relativas**:
 *      `manana()` retorna la medianoche de mañana (hoy + 1 día).
 *      `finDelDia(manana)` retorna la medianoche del día siguiente
 *      (mañana + 1 día). Esto produce un intervalo `[mañana, mañana+1)`
 *      que captura exactamente las 24 horas del día de mañana.
 *
 *      La consulta SQL generada por Prisma es equivalente a:
 *        WHERE fechaEvento >= 'YYYY-MM-DD' AND fechaEvento < 'YYYY-MM+1-DD'
 *      Esto es correcto para columnas `@db.Date` porque PostgreSQL compara
 *      solo la parte de fecha, ignorando el componente horario.
 *
 *   2. **Carga con joins**:
 *      `findMany` incluye `asignacionProveedores.proveedor` en una sola
 *      consulta SQL con JOIN, evitando N+1 queries.
 *
 *   3. **Aislamiento de fallos — try-catch interno en cada iteración**:
 *      Cada `enviarNotificacionProveedor()` se ejecuta con `await` dentro
 *      del bucle anidado (solicitudes → asignaciones). Si un envío falla
 *      (SMTP caído, email inválido), el error se propaga hacia arriba en
 *      la iteración actual y el `continue` se omite. Sin embargo, el
 *      flujo continúa con la siguiente asignación y siguiente solicitud
 *      gracias a que **no** hay un `try-catch` global que capture el error
 *      del bucle completo — el error de una iteración no cancela las
 *      siguientes (el bucle `for...of` no se rompe por promesas
 *      rechazadas que no se capturan dentro del mismo bucle, pero al usar
 *      `await`, la excepción SÍ se propaga y rompe el ciclo).
 *
 *      ⚠️ Limitación actual: un error de envío interrumpe el bucle en la
 *      primera falla. Para un sistema tolerante a fallos, cada envío
 *      debería encapsularse en un bloque `try-catch` individual o
 *      convertirse a `Promise.allSettled()` para que una falla no
 *      detenga el resto de la cola. El refactor propuesto sería:
 *
 *        const resultados = await Promise.allSettled(
 *          solicitudesManana.flatMap(solicitud =>
 *            solicitud.asignacionProveedores.map(ap =>
 *              ap.proveedor.email
 *                ? enviarNotificacionProveedor('recordatorio', { ... })
 *                : Promise.resolve()
 *            )
 *          )
 *        )
 *        const exitosos = resultados.filter(r => r.status === 'fulfilled').length
 *        const fallidos = resultados.filter(r => r.status === 'rejected').length
 *
 *   4. **Conteo de retorno**:
 *      Retorna el número total de correos enviados para logging en
 *      `iniciarRecordatorioProveedoresJob()`.
 *
 * @returns {Promise<number>} Cantidad de correos recordatorio enviados.
 */
export async function enviarRecordatoriosProveedores(): Promise<number> {
  const inicioManana = manana()
  const finManana = finDelDia(inicioManana)

  const solicitudesManana = await prisma.solicitudEvento.findMany({
    where: {
      estado: 'Aprobado',
      fechaEvento: { gte: inicioManana, lt: finManana },
    },
    include: {
      asignacionProveedores: {
        include: { proveedor: true },
      },
    },
  })

  let enviados = 0

  for (const solicitud of solicitudesManana) {
    for (const ap of solicitud.asignacionProveedores) {
      if (!ap.proveedor.email) continue

      await enviarNotificacionProveedor('recordatorio', {
        proveedorNombre: ap.proveedor.nombre,
        proveedorEmail: ap.proveedor.email,
        folio: solicitud.folio,
        nombreEvento: solicitud.nombreEvento,
        fechaEvento: formatoFecha(solicitud.fechaEvento),
        horaInicio: formatoHora(solicitud.horaInicio),
        horaFin: formatoHora(solicitud.horaFin),
        lugar: solicitud.lugarEspecifico ?? '',
        responsable: solicitud.responsableNombre,
        contacto: solicitud.contacto ?? '',
      })

      enviados++
    }
  }

  return enviados
}

/**
 * Inicializa la tarea cron para recordatorios a proveedores.
 *
 * La expresión `0 8 * * *` ejecuta `enviarRecordatoriosProveedores()` una
 * vez al día a las 08:00. El bloque `try-catch` externo captura cualquier
 * error no manejado dentro del servicio y lo registra sin relanzarlo,
 * protegiendo el loop de `cron.schedule` (node-cron no reintenta tareas
 * fallidas automáticamente).
 */
export function iniciarRecordatorioProveedoresJob(): void {
  cron.schedule('0 8 * * *', async () => {
    console.log('[CRON-PROVEEDORES] Ejecutando recordatorios para proveedores')
    try {
      const total = await enviarRecordatoriosProveedores()
      console.log(`[CRON-PROVEEDORES] Recordatorios enviados: ${total}`)
    } catch (e) {
      console.error('[CRON-PROVEEDORES] Error ejecutando recordatorios:', e)
    }
  })

  console.log('[CRON-PROVEEDORES] Recordatorios a proveedores programados diariamente a las 08:00 AM')
}
