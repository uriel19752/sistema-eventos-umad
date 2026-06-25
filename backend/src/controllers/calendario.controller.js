import prisma from '../config/db.js';
function combinarFechaHora(fecha, hora) {
    const y = fecha.getUTCFullYear();
    const m = String(fecha.getUTCMonth() + 1).padStart(2, '0');
    const d = String(fecha.getUTCDate()).padStart(2, '0');
    const hh = String(hora.getUTCHours()).padStart(2, '0');
    const mm = String(hora.getUTCMinutes()).padStart(2, '0');
    return `${y}-${m}-${d}T${hh}:${mm}:00`;
}
export async function obtenerEventosCalendario(_req, res) {
    try {
        const eventos = await prisma.solicitudEvento.findMany({
            where: { estado: 'Aprobado' },
            select: {
                id: true,
                folio: true,
                nombreEvento: true,
                fechaEvento: true,
                horaInicio: true,
                horaFin: true,
                lugarEspecifico: true,
                responsableNombre: true,
                estado: true,
                googleEventLink: true,
            },
        });
        const formatted = eventos.map((e) => ({
            id: e.id,
            title: e.nombreEvento,
            start: combinarFechaHora(e.fechaEvento, e.horaInicio),
            end: combinarFechaHora(e.fechaEvento, e.horaFin),
            folio: e.folio,
            responsable: e.responsableNombre,
            lugar: e.lugarEspecifico,
            estado: e.estado,
            googleEventLink: e.googleEventLink,
        }));
        res.json(formatted);
    }
    catch (error) {
        console.error('[Calendario] Error obteniendo eventos:', error);
        res.status(500).json({ error: 'Error al obtener eventos del calendario' });
    }
}
//# sourceMappingURL=calendario.controller.js.map