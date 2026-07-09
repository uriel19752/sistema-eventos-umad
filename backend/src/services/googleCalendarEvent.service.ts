import { getCalendarClient } from './googleCalendar.service.js'

export async function eliminarEventoSolicitud(googleEventId: string | null | undefined): Promise<void> {
  if (!googleEventId) {
    console.log('[Google Calendar] Evento omitido: la solicitud no posee googleEventId')
    return
  }

  const calendar = getCalendarClient()
  const calendarId = process.env.GOOGLE_CALENDAR_ID ?? ''

  console.log(`[Google Calendar] Eliminando evento... (ID: ${googleEventId})`)

  try {
    await calendar.events.delete({
      calendarId,
      eventId: googleEventId,
    })

    console.log('[Google Calendar] Evento eliminado correctamente')
  } catch (error: any) {
    if (error?.response?.status === 404) {
      console.log('[Google Calendar] Evento no encontrado en Calendar')
      return
    }

    console.error('[Google Calendar] Error eliminando evento:', error?.response?.data?.error?.message ?? error?.message ?? error)
    if (error?.response?.data?.error) {
      console.error('[Google Calendar] Detalle completo del error:', JSON.stringify(error.response.data.error, null, 2))
    }
  }
}

interface MaterialInfo {
  tipoMaterial: string
  descripcionOtro: string | null
}

interface SolicitudData {
  id: number
  folio: string
  nombreEvento: string
  fechaEvento: Date
  horaInicio: Date
  horaFin: Date
  horaMontaje: Date | null
  descripcion: string | null
  objetivoCobertura: string | null
  responsableNombre: string
  departamentoSolicitante: string | null
  lugarEspecifico: string | null
  ubicacion: string | null
  contacto: string | null
  autoridadesAsistentes: string | null
  observaciones: string | null
  googleEventId: string | null
  materialSolicitado?: MaterialInfo[]
  }

function combinarFechaHora(fecha: Date, hora: Date): string {
  const y = fecha.getUTCFullYear();
  const m = String(fecha.getUTCMonth() + 1).padStart(2, '0');
  const d = String(fecha.getUTCDate()).padStart(2, '0');

  const stringHora = hora instanceof Date ? hora.toISOString() : String(hora);
  const match = stringHora.match(/(?:T|\s|^)(\d{2}):(\d{2})/);
  const hh = match ? match[1] : '00';
  const mm = match ? match[2] : '00';

  const localDate = new Date(`${y}-${m}-${d}T${hh}:${mm}:00-06:00`);
  return localDate.toISOString();
}

function formatearFecha(fecha: Date): string {
  const y = fecha.getUTCFullYear()
  const m = String(fecha.getUTCMonth() + 1).padStart(2, '0')
  const d = String(fecha.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatearHora(hora: Date): string {
  const hh = String(hora.getUTCHours()).padStart(2, '0')
  const mm = String(hora.getUTCMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}

export function construirDescription(solicitud: SolicitudData): string {
  const materiales = solicitud.materialSolicitado ?? []
  const foto = materiales.some(m => m.tipoMaterial === 'Fotografia') ? '✅ SÍ' : '❌ NO'
  const nota = materiales.some(m => m.tipoMaterial === 'Nota_Web') ? '✅ SÍ' : '❌ NO'
  const banners = materiales.some(m => m.tipoMaterial === 'Banner') ? '✅ SÍ' : '❌ NO'
  const otroMat = materiales.find(m => m.tipoMaterial === 'Otro')

  const horaMontajeStr = solicitud.horaMontaje ? formatearHora(solicitud.horaMontaje) : 'No especificada'
  const horaInicioStr = formatearHora(solicitud.horaInicio)
  const horaFinStr = formatearHora(solicitud.horaFin)

  return [
    '🐾 TIGRETRACK • COBERTURA INFORMATIVA',
    '',
    '📝 DESCRIPCIÓN DEL EVENTO',
    solicitud.descripcion || 'No especificada',
    '',
    '🎯 OBJETIVO DE COMUNICACIÓN',
    solicitud.objetivoCobertura || 'No especificado',
    '',
    '📍 UBICACIÓN DE COBERTURA',
    `• 🏛️ Plantel: ${solicitud.lugarEspecifico || 'UMAD'}`,
    `• 📍 Espacio Específico: ${solicitud.ubicacion || 'No especificado'}`,
    '',
    '⏰ LOGÍSTICA DE TIEMPOS',
    `• 🛠️ Hora de Montaje: ${horaMontajeStr}`,
    `• 🚀 Duración del Evento: ${horaInicioStr} a ${horaFinStr}`,
    '',
    '👥 RESPONSABLES',
    `• 👤 Organiza: ${solicitud.responsableNombre || 'No especificado'}`,
    `• 🏢 Área/Depto: ${solicitud.departamentoSolicitante || 'No especificado'}`,
    `• 📱 WhatsApp Contacto: ${solicitud.contacto || 'No especificado'}`,
    `• 🎓 Autoridades Asistentes: ${solicitud.autoridadesAsistentes || 'Ninguna'}`,
    '',
    '🛠️ ENTREGABLES COMPROMETIDOS',
    `• 📷 Servicio de Fotografía: ${foto}`,
    `• ✍️ Nota Informativa Web: ${nota}`,
    `• 🎨 Diseño de Banners: ${banners}`,
    `• ➕ Otro requerimiento: ${otroMat?.descripcionOtro || 'Ninguno'}`,
    '',
    '____________________________________________',
    'Generated automatically by TigreTrack · Sistema Madero',
    '🔗 Panel de solicitudes: http://localhost:5173/dashboard',
  ].join('\n')
}

export async function crearEventoSolicitud(solicitud: SolicitudData): Promise<{ id: string; htmlLink: string } | null> {
  if (solicitud.googleEventId) {
    console.log(`[Google Calendar] Evento omitido: la solicitud ${solicitud.folio} ya tiene evento (${solicitud.googleEventId})`)
    return null
  }

  const calendar = getCalendarClient()
  const calendarId = process.env.GOOGLE_CALENDAR_ID ?? ''

  const description = construirDescription(solicitud)

  console.log("[Google Calendar] Datos enviados a Google:", JSON.stringify({
    calendarId,
    summary: `Cobertura: ${solicitud.nombreEvento}`,
    location: solicitud.ubicacion,
    start: combinarFechaHora(solicitud.fechaEvento, solicitud.horaInicio),
    end: combinarFechaHora(solicitud.fechaEvento, solicitud.horaFin),
  }, null, 2))

  const ymdAdmin = new Date(solicitud.fechaEvento).toISOString().split('T')[0] ?? '0000-00-00';
  const extraerHoraAdmin = (h: any) => h && String(h).includes('T') ? (String(h).split('T')[1]?.substring(0, 5) ?? '00:00') : String(h).substring(0, 5);

  try {
    const event = await calendar.events.insert({
      calendarId,
      requestBody: {
        summary: `Cobertura: ${solicitud.nombreEvento}`,
        location: solicitud.ubicacion ?? '',
        description,
        start: {
          dateTime: combinarFechaHora(solicitud.fechaEvento, solicitud.horaInicio),
        },
        end: {
          dateTime: combinarFechaHora(solicitud.fechaEvento, solicitud.horaFin),
        },
      },
    })

    const eventId = event.data.id ?? null
    const htmlLink = event.data.htmlLink ?? null
    console.log(`[Google Calendar] Evento creado: ${solicitud.nombreEvento} (ID: ${eventId})`)
    if (eventId && htmlLink) {
      return { id: eventId, htmlLink }
    }
    return null
  } catch (error: any) {
    console.error('[Google Calendar] Error creando evento:', error?.response?.data?.error?.message ?? error?.message ?? error)
    if (error?.response?.data?.error) {
      console.error('[Google Calendar] Detalle completo del error:', JSON.stringify(error.response.data.error, null, 2))
    }
    return null
  }
}

export async function actualizarEventoSolicitud(googleEventId: string, solicitud: SolicitudData): Promise<void> {
  const calendar = getCalendarClient()
  const calendarId = process.env.GOOGLE_CALENDAR_ID ?? ''

  const description = construirDescription(solicitud)

  console.log("[Google Calendar] Datos enviados a PATCH Google:", JSON.stringify({
    calendarId,
    eventId: googleEventId,
    summary: `Cobertura: ${solicitud.nombreEvento}`,
    location: solicitud.ubicacion,
    start: combinarFechaHora(solicitud.fechaEvento, solicitud.horaInicio),
    end: combinarFechaHora(solicitud.fechaEvento, solicitud.horaFin),
  }, null, 2))

  try {
    await calendar.events.patch({
      calendarId,
      eventId: googleEventId,
      requestBody: {
        summary: `Cobertura: ${solicitud.nombreEvento}`,
        location: solicitud.ubicacion ?? '',
        description,
        start: {
          dateTime: combinarFechaHora(solicitud.fechaEvento, solicitud.horaInicio),
        },
        end: {
          dateTime: combinarFechaHora(solicitud.fechaEvento, solicitud.horaFin),
        },
      },
    })

    console.log(`[Google Calendar] Evento actualizado: ${solicitud.nombreEvento} (ID: ${googleEventId})`)
  } catch (error: any) {
    console.error('[Google Calendar] Error actualizando evento:', error?.response?.data?.error?.message ?? error?.message ?? error)
    if (error?.response?.data?.error) {
      console.error('[Google Calendar] Detalle completo del error:', JSON.stringify(error.response.data.error, null, 2))
    }
  }
}