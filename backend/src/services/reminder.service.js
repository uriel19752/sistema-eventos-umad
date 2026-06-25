import prisma from '../config/db.js';
import { enviarCorreoRecordatorio } from './mailService.js';
function formatoFecha(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dia}`;
}
function formatoHora(d) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function hoy() {
    const ahora = new Date();
    return new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
}
function dentroDeDias(n) {
    const base = hoy();
    return new Date(base.getTime() + n * 86400000);
}
export async function procesarRecordatorios() {
    console.log('[CRON] Ejecutando recordatorios automáticos');
    const hoyDate = hoy();
    const mananaDate = dentroDeDias(1);
    const sieteDiasDate = dentroDeDias(7);
    let enviados = 0;
    const solicitudes = await prisma.solicitudEvento.findMany({
        where: { estado: 'Aprobado' },
        include: {
            usuario: {
                select: { id: true, correo: true, rol: true },
            },
        },
    });
    for (const solicitud of solicitudes) {
        if (!solicitud.usuario?.correo) {
            console.log('[CRON] Solicitud sin usuario asociado');
            continue;
        }
        const fechaEvento = new Date(solicitud.fechaEvento.getFullYear(), solicitud.fechaEvento.getMonth(), solicitud.fechaEvento.getDate());
        const diffMs = fechaEvento.getTime() - hoyDate.getTime();
        const diffDias = Math.round(diffMs / 86400000);
        if (diffDias === 7 && !solicitud.recordatorio7DiasEnviado) {
            enviarCorreoRecordatorio({
                destinatario: solicitud.usuario.correo,
                folio: solicitud.folio,
                nombreEvento: solicitud.nombreEvento,
                fechaEvento: formatoFecha(solicitud.fechaEvento),
                horaInicio: formatoHora(solicitud.horaInicio),
                responsableNombre: solicitud.responsableNombre,
                diasRestantes: 7,
            }).catch((e) => console.error('[MAIL] Error enviando recordatorio 7 días', e));
            await prisma.solicitudEvento.update({
                where: { id: solicitud.id },
                data: { recordatorio7DiasEnviado: true },
            });
            console.log(`[CRON] Recordatorio enviado a ${solicitud.usuario.correo}`);
            enviados++;
            continue;
        }
        if (diffDias === 1 && !solicitud.recordatorio24HorasEnviado) {
            enviarCorreoRecordatorio({
                destinatario: solicitud.usuario.correo,
                folio: solicitud.folio,
                nombreEvento: solicitud.nombreEvento,
                fechaEvento: formatoFecha(solicitud.fechaEvento),
                horaInicio: formatoHora(solicitud.horaInicio),
                responsableNombre: solicitud.responsableNombre,
                diasRestantes: 1,
            }).catch((e) => console.error('[MAIL] Error enviando recordatorio 24h', e));
            await prisma.solicitudEvento.update({
                where: { id: solicitud.id },
                data: { recordatorio24HorasEnviado: true },
            });
            console.log(`[CRON] Recordatorio enviado a ${solicitud.usuario.correo}`);
            enviados++;
        }
    }
    if (enviados === 0) {
        console.log('[CRON] No existen eventos pendientes de recordatorio');
    }
}
//# sourceMappingURL=reminder.service.js.map