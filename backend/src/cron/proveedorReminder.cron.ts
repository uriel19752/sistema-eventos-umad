import cron from 'node-cron'
import prisma from '../config/db.js'
import { enviarNotificacionProveedor } from '../services/mailService.js'

function formatoFecha(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dia}`
}

function formatoHora(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function manana(): Date {
  const ahora = new Date()
  const inicioManana = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
  inicioManana.setDate(inicioManana.getDate() + 1)
  return inicioManana
}

function finDelDia(fecha: Date): Date {
  const fin = new Date(fecha)
  fin.setDate(fin.getDate() + 1)
  return fin
}

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
