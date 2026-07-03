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
    const materiales = solicitud.materialSolicitado ?? [];
    const tieneFoto = materiales.some(m => m.tipoMaterial === 'Fotografia');
    const tieneNota = materiales.some(m => m.tipoMaterial === 'Nota_Web');
    const tieneBanner = materiales.some(m => m.tipoMaterial === 'Banner');
    const otroMat = materiales.find(m => m.tipoMaterial === 'Otro');
    const montajeHora = solicitud.horaMontaje
        ? formatearHora(solicitud.horaMontaje)
        : 'No requiere';
    const description = [
        '🐾 TIGRETRACK • COBERTURA INFORMATIVA',
        '',
        `📝 DESCRIPCIÓN DEL EVENTO`,
        solicitud.descripcion ?? 'Sin descripción',
        '',
        `🎯 OBJETIVO DE COMUNICACIÓN`,
        solicitud.objetivoCobertura ?? 'No especificado',
        '',
        `📍 UBICACIÓN DE COBERTURA`,
        `• 🏛️ Plantel: ${solicitud.lugarEspecifico ?? 'No especificado'}`,
        `• 📍 Espacio Específico: ${solicitud.ubicacion ?? 'No especificado'}`,
        '',
        `⏰ LOGÍSTICA DE TIEMPOS`,
        `• 🛠️ Hora de Montaje: ${montajeHora}`,
        `• 🚀 Duración del Evento: ${formatearHora(solicitud.horaInicio)} a ${formatearHora(solicitud.horaFin)}`,
        '',
        `👥 RESPONSABLES`,
        `• 👤 Organiza: ${solicitud.responsableNombre ?? 'No especificado'}`,
        `• 🏢 Área/Depto: ${solicitud.departamentoSolicitante ?? 'No especificado'}`,
        `• 📱 WhatsApp Contacto: ${solicitud.contacto ?? 'No especificado'}`,
        `• 🎓 Autoridades Asistentes: ${solicitud.autoridadesAsistentes ?? 'No especificado'}`,
        '',
        `🛠️ ENTREGABLES COMPROMETIDOS`,
        `• 📷 Servicio de Fotografía: ${tieneFoto ? '✅ SÍ' : '❌ NO'}`,
        `• ✍️ Nota Informativa Web: ${tieneNota ? '✅ SÍ' : '❌ NO'}`,
        `• 🎨 Diseño de Banners: ${tieneBanner ? '✅ SÍ' : '❌ NO'}`,
        `• ➕ Otro requerimiento: ${otroMat?.descripcionOtro ?? 'Ninguno'}`,
        '',
        `____________________________________________`,
        `Generated automatically by TigreTrack · Sistema Madero`,
        `🔗 Panel de solicitudes: http://localhost:5173/dashboard`,
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