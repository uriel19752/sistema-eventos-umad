import prisma from '../config/db.js';
import { crearNotificacion } from '../services/notificacion.service.js';
export async function registrarEncuesta(req, res) {
    try {
        const { solicitud_id, puntualidad, calidadTecnica, atencionStaff, satisfaccionGral, comentarios } = req.body;
        if (!solicitud_id) {
            res.status(400).json({ error: 'Falta solicitud_id' });
            return;
        }
        const p = Number(puntualidad);
        const ct = Number(calidadTecnica);
        const as = Number(atencionStaff);
        const sg = Number(satisfaccionGral);
        if ([p, ct, as, sg].some((v) => isNaN(v) || !Number.isInteger(v) || v < 1 || v > 5)) {
            res.status(400).json({ error: 'Todos los criterios deben ser números enteros entre 1 y 5' });
            return;
        }
        const solicitudIdStr = String(solicitud_id);
        const solicitudIdNum = Number(solicitud_id);
        const whereOr = [{ folio: solicitudIdStr }];
        if (!isNaN(solicitudIdNum) && solicitudIdNum <= 2147483647) {
            whereOr.push({ id: solicitudIdNum });
        }
        const solicitud = await prisma.solicitudEvento.findFirst({
            where: {
                OR: whereOr,
            }
        });
        if (!solicitud) {
            res.status(404).json({ error: 'Solicitud de evento no encontrada con el identificador o folio proporcionado' });
            return;
        }
        const encuesta = await prisma.encuestaSatisfaccion.create({
            data: {
                solicitudId: solicitud.id,
                puntualidad: p,
                calidadTecnica: ct,
                atencionStaff: as,
                satisfaccionGral: sg,
                comentarios: comentarios ?? null,
            },
        });
        if (sg <= 3) {
            prisma.usuario
                .findMany({ where: { rol: "ADMIN" }, select: { id: true } })
                .then((admins) => {
                for (const admin of admins) {
                    crearNotificacion(admin.id, "\uD83D\uDD25 Alerta de Satisfacción Baja", `El evento "${solicitud.nombreEvento}" (folio ${solicitud.folio}) recibió una calificación general de ${sg}/5.`).catch((e) => console.error("[NOTIFICACION] Error creando notificación", e));
                }
            })
                .catch((e) => console.error("[NOTIFICACION] Error buscando administradores", e));
        }
        res.status(201).json(encuesta);
    }
    catch (error) {
        console.error('Error al registrar encuesta en DB:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}
export async function obtenerEncuestasPorEvento(req, res) {
    try {
        const solicitudId = Number(req.params.solicitudId);
        if (!solicitudId) {
            res.status(400).json({ error: 'solicitudId inválido' });
            return;
        }
        const encuestas = await prisma.encuestaSatisfaccion.findMany({
            where: { solicitudId },
            orderBy: { fechaRespuesta: 'desc' },
        });
        const total = encuestas.length;
        const promedios = total > 0
            ? {
                puntualidad: encuestas.reduce((s, e) => s + e.puntualidad, 0) / total,
                calidadTecnica: encuestas.reduce((s, e) => s + e.calidadTecnica, 0) / total,
                atencionStaff: encuestas.reduce((s, e) => s + e.atencionStaff, 0) / total,
                satisfaccionGral: encuestas.reduce((s, e) => s + e.satisfaccionGral, 0) / total,
            }
            : { puntualidad: 0, calidadTecnica: 0, atencionStaff: 0, satisfaccionGral: 0 };
        const promedioGlobal = total > 0
            ? (promedios.puntualidad + promedios.calidadTecnica + promedios.atencionStaff + promedios.satisfaccionGral) / 4
            : 0;
        const distribucionEstrellas = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        for (const e of encuestas) {
            distribucionEstrellas[e.satisfaccionGral] = (distribucionEstrellas[e.satisfaccionGral] ?? 0) + 1;
        }
        res.json({
            encuestas,
            total,
            promedios: {
                puntualidad: Math.round(promedios.puntualidad * 100) / 100,
                calidadTecnica: Math.round(promedios.calidadTecnica * 100) / 100,
                atencionStaff: Math.round(promedios.atencionStaff * 100) / 100,
                satisfaccionGral: Math.round(promedios.satisfaccionGral * 100) / 100,
            },
            promedioGlobal: Math.round(promedioGlobal * 100) / 100,
            distribucionEstrellas,
        });
    }
    catch (error) {
        console.error('Error al obtener encuestas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}
function construirFiltroSolicitud(req) {
    const { plantel, institucion } = req.query;
    const where = {};
    if (plantel && plantel !== "todos") {
        where.plantel = { nombre: plantel };
    }
    if (institucion && institucion !== "todos") {
        where.institucion = { nombre: institucion };
    }
    return where;
}
export async function obtenerResumenGlobal(req, res) {
    try {
        const solicitudWhere = construirFiltroSolicitud(req);
        const esAdmin = req.usuario?.rol === 'ADMIN';
        if (!esAdmin && req.usuario?.id) {
            solicitudWhere.usuarioId = req.usuario.id;
        }
        const encuestas = await prisma.encuestaSatisfaccion.findMany({
            ...(Object.keys(solicitudWhere).length > 0
                ? { where: { solicitud: solicitudWhere } }
                : {}),
        });
        const total = encuestas.length;
        const promedios = total > 0
            ? {
                puntualidad: encuestas.reduce((s, e) => s + e.puntualidad, 0) / total,
                calidadTecnica: encuestas.reduce((s, e) => s + e.calidadTecnica, 0) / total,
                atencionStaff: encuestas.reduce((s, e) => s + e.atencionStaff, 0) / total,
                satisfaccionGral: encuestas.reduce((s, e) => s + e.satisfaccionGral, 0) / total,
            }
            : { puntualidad: 0, calidadTecnica: 0, atencionStaff: 0, satisfaccionGral: 0 };
        const promedioGlobal = total > 0
            ? (promedios.puntualidad + promedios.calidadTecnica + promedios.atencionStaff + promedios.satisfaccionGral) / 4
            : 0;
        const distribucionEstrellas = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        for (const e of encuestas) {
            distribucionEstrellas[e.satisfaccionGral] = (distribucionEstrellas[e.satisfaccionGral] ?? 0) + 1;
        }
        res.json({
            promedios: {
                puntualidad: Math.round(promedios.puntualidad * 100) / 100,
                calidadTecnica: Math.round(promedios.calidadTecnica * 100) / 100,
                atencionStaff: Math.round(promedios.atencionStaff * 100) / 100,
                satisfaccionGral: Math.round(promedios.satisfaccionGral * 100) / 100,
            },
            promedioGlobal: Math.round(promedioGlobal * 100) / 100,
            totalEncuestas: total,
            distribucionEstrellas,
        });
    }
    catch (error) {
        console.error('Error al obtener resumen global:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}
export async function obtenerTodasEncuestas(req, res) {
    try {
        const solicitudWhere = construirFiltroSolicitud(req);
        const esAdmin = req.usuario?.rol === 'ADMIN';
        if (!esAdmin && req.usuario?.id) {
            solicitudWhere.usuarioId = req.usuario.id;
        }
        const encuestas = await prisma.encuestaSatisfaccion.findMany({
            ...(Object.keys(solicitudWhere).length > 0
                ? { where: { solicitud: solicitudWhere } }
                : {}),
            orderBy: { fechaRespuesta: 'desc' },
            include: {
                solicitud: {
                    select: {
                        folio: true,
                        nombreEvento: true,
                        fechaEvento: true,
                    }
                }
            }
        });
        res.json(encuestas);
    }
    catch (error) {
        console.error('Error al obtener todas las encuestas:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}
//# sourceMappingURL=encuesta.controller.js.map