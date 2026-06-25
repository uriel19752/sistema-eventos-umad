import { getCalendarClient } from './googleCalendar.service.js';
/**
 * Elimina un evento de Google Calendar asociado a una solicitud cancelada.
 *
 * - Se ejecuta después de que la cancelación ya fue persistida en BD.
 * - Nunca lanza excepción; los errores se registran en consola.
 * - Útil también como base para futuras ampliaciones:
 *   → Actualización de eventos (editar fecha/hora/lugar).
 *   → Reprogramación (eliminar + crear con nuevos datos).
 */
export async function eliminarEventoSolicitud(googleEventId) {
    if (!googleEventId) {
        console.log('[Google Calendar] Evento omitido: la solicitud no posee googleEventId');
        return;
    }
    const calendar = getCalendarClient();
    const calendarId = process.env.GOOGLE_CALENDAR_ID ?? '';
    console.log(`[Google Calendar] Eliminando evento... (ID: ${googleEventId})`);
    try {
        await calendar.events.delete({
            calendarId,
            eventId: googleEventId,
        });
        console.log('[Google Calendar] Evento eliminado correctamente');
    }
    catch (error) {
        // Si el evento ya no existe en Calendar, no es un error crítico
        if (error?.response?.status === 404) {
            console.log('[Google Calendar] Evento no encontrado en Calendar');
            return;
        }
        console.error('[Google Calendar] Error eliminando evento:', error?.message ?? error);
    }
}
function combinarFechaHora(fecha, hora) {
    const y = fecha.getUTCFullYear();
    const m = String(fecha.getUTCMonth() + 1).padStart(2, '0');
    const d = String(fecha.getUTCDate()).padStart(2, '0');
    const hh = String(hora.getUTCHours()).padStart(2, '0');
    const mm = String(hora.getUTCMinutes()).padStart(2, '0');
    return `${y}-${m}-${d}T${hh}:${mm}:00`;
}
function formatearFecha(fecha) {
    const y = fecha.getUTCFullYear();
    const m = String(fecha.getUTCMonth() + 1).padStart(2, '0');
    const d = String(fecha.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
function formatearHora(hora) {
    const hh = String(hora.getUTCHours()).padStart(2, '0');
    const mm = String(hora.getUTCMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
}
export async function crearEventoSolicitud(solicitud) {
    if (solicitud.googleEventId) {
        console.log(`[Google Calendar] Evento omitido: la solicitud ${solicitud.folio} ya tiene evento (${solicitud.googleEventId})`);
        return null;
    }
    const calendar = getCalendarClient();
    const calendarId = process.env.GOOGLE_CALENDAR_ID ?? '';
    const montajeStr = solicitud.horaMontaje
        ? `${formatearFecha(solicitud.fechaEvento)} ${formatearHora(solicitud.horaMontaje)}`
        : 'No requiere';
    const description = [
        '------------------------------------------------',
        'Solicitud TigreTrack',
        '',
        `Folio: ${solicitud.folio}`,
        `Nombre del evento: ${solicitud.nombreEvento}`,
        `Solicitante: ${solicitud.responsableNombre}`,
        `Área: ${solicitud.departamentoSolicitante ?? 'No especificada'}`,
        `Objetivo: ${solicitud.objetivoCobertura ?? 'No especificado'}`,
        `Ubicación: ${solicitud.ubicacion ?? 'No especificada'}`,
        `Hora de montaje: ${montajeStr}`,
        `Hora de inicio: ${formatearFecha(solicitud.fechaEvento)} ${formatearHora(solicitud.horaInicio)}`,
        `Hora de término: ${formatearFecha(solicitud.fechaEvento)} ${formatearHora(solicitud.horaFin)}`,
        `Número de asistentes: ${solicitud.publicoObjetivo ?? 'No especificado'}`,
        `Observaciones: ${solicitud.observaciones ?? 'Ninguna'}`,
        '',
        'Solicitado desde TigreTrack.',
        '------------------------------------------------',
    ].join('\n');
    try {
        const event = await calendar.events.insert({
            calendarId,
            requestBody: {
                summary: `Cobertura: ${solicitud.nombreEvento}`,
                location: solicitud.ubicacion ?? '',
                description,
                start: {
                    dateTime: combinarFechaHora(solicitud.fechaEvento, solicitud.horaInicio),
                    timeZone: 'America/Mexico_City',
                },
                end: {
                    dateTime: combinarFechaHora(solicitud.fechaEvento, solicitud.horaFin),
                    timeZone: 'America/Mexico_City',
                },
            },
        });
        const eventId = event.data.id ?? null;
        const htmlLink = event.data.htmlLink ?? null;
        console.log(`[Google Calendar] Evento creado: ${solicitud.nombreEvento} (ID: ${eventId})`);
        if (eventId && htmlLink) {
            return { id: eventId, htmlLink };
        }
        return null;
    }
    catch (error) {
        console.error('[Google Calendar] Error creando evento:', error);
        return null;
    }
}
//# sourceMappingURL=googleCalendarEvent.service.js.map