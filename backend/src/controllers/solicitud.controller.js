import * as solicitudService from '../services/solicitud.service.js';
import prisma from '../config/db.js';
import { enviarCorreoModificacion } from '../services/mailService.js';
function getUsuario(req) {
    if (!req.usuario) {
        throw Object.assign(new Error('Usuario no autenticado'), { statusCode: 401 });
    }
    return { id: req.usuario.id, rol: req.usuario.rol };
}
export const crearSolicitud = async (req, res) => {
    try {
        const usuario = getUsuario(req);
        // Ajustamos el DTO para capturar las IDs que alimentan las estadísticas
        const dto = {
            folio: req.body.folio,
            nombreEvento: req.body.nombreEvento,
            descripcion: req.body.descripcion,
            objetivo: req.body.objetivo,
            publico: req.body.publico,
            autoridades: req.body.autoridades,
            lugarSeleccionado: req.body.lugarSeleccionado,
            lugar: req.body.lugar,
            ubicacion: req.body.ubicacion,
            fechaEvento: req.body.fechaEvento,
            horaInicio: req.body.horaInicio,
            horaFin: req.body.horaFin,
            horaMontaje: req.body.horaMontaje,
            responsableNombre: req.body.responsableNombre,
            contacto: req.body.contacto,
            area: req.body.area,
            observaciones: req.body.observaciones,
            institucionPersonalizada: req.body.institucionPersonalizada,
            datosEspecificos: req.body.datosEspecificos,
            croquisUrl: req.body.croquisUrl,
            materiales: req.body.materiales,
            // 🔑 SOLUCIÓN: Inyección y conversión explícita de las llaves relacionales
            plantelId: Number(req.body.plantelId),
            ...(req.body.institucionId !== undefined && { institucionId: Number(req.body.institucionId) }),
        };
        // Asegúrate de que tu servicio reciba estas dos propiedades en el objeto
        const solicitud = await solicitudService.crearSolicitud(dto, usuario);
        return res.status(201).json({
            id: solicitud.id,
            folio: solicitud.folio,
            nombreEvento: solicitud.nombreEvento,
            success: true,
            message: 'Solicitud creada con éxito en la base de datos',
        });
    }
    catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({ error: error.message });
        }
        console.error('Error al crear solicitud:', error);
        return res.status(500).json({ error: 'Error interno al procesar el registro del evento' });
    }
};
export async function obtenerSolicitudes(req, res) {
    try {
        const usuario = getUsuario(req);
        const solicitudes = await solicitudService.obtenerSolicitudes(usuario);
        res.status(200).json(solicitudes);
    }
    catch (error) {
        const statusCode = error.statusCode || 500;
        const message = statusCode === 500 ? 'Error interno al obtener el listado de solicitudes' : error.message;
        if (statusCode === 500)
            console.error('Error al listar solicitudes:', error);
        res.status(statusCode).json({ error: message });
    }
}
export async function obtenerSolicitudPorId(req, res) {
    try {
        const usuario = getUsuario(req);
        const id = Number(req.params.id);
        const solicitud = await solicitudService.obtenerSolicitudPorId(id, usuario);
        res.json(solicitud);
    }
    catch (error) {
        const statusCode = error.statusCode || 500;
        const message = statusCode === 500 ? 'Error interno del servidor' : error.message;
        if (statusCode === 500)
            console.error('Error al obtener solicitud:', error);
        res.status(statusCode).json({ error: message });
    }
}
export async function obtenerSolicitudPublica(req, res) {
    try {
        const id = Number(req.params.id);
        if (!id) {
            res.status(400).json({ error: 'ID inválido' });
            return;
        }
        const solicitud = await prisma.solicitudEvento.findUnique({
            where: { id },
            select: { nombreEvento: true },
        });
        if (!solicitud) {
            res.status(404).json({ error: 'Solicitud no encontrada' });
            return;
        }
        res.json({ nombreEvento: solicitud.nombreEvento });
    }
    catch (error) {
        console.error('Error al obtener solicitud pública:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}
export async function actualizarEstado(req, res) {
    try {
        const usuario = getUsuario(req);
        const id = Number(req.params.id);
        const resultado = await solicitudService.actualizarEstado(id, req.body, usuario);
        res.json(resultado);
    }
    catch (error) {
        if (error.warning && error.statusCode === 409) {
            res.status(409).json({
                warning: true,
                message: error.message,
                conflictos: error.conflictos,
            });
            return;
        }
        const statusCode = error.statusCode || 500;
        const message = statusCode === 500 ? 'Error interno del servidor' : error.message;
        if (statusCode === 500)
            console.error('Error al actualizar estado:', error);
        res.status(statusCode).json({ error: message });
    }
}
export async function editarSolicitud(req, res) {
    try {
        const usuario = getUsuario(req);
        const id = Number(req.params.id);
        const data = {
            ...req.body,
            plantelId: req.body.plantelId != null ? Number(req.body.plantelId) : undefined,
            institucionId: req.body.institucionId != null ? Number(req.body.institucionId) : undefined,
            institucionPersonalizada: req.body.institucionPersonalizada,
            datosEspecificos: req.body.datosEspecificos,
            croquisUrl: req.body.croquisUrl,
        };
        const solicitudActual = await prisma.solicitudEvento.findUnique({
            where: { id },
            select: { estado: true, usuarioId: true },
        });
        const result = await solicitudService.editarSolicitud(id, data, usuario);
        if (usuario.rol === 'USER') {
            await enviarCorreoModificacion({
                folio: result.folio,
                nombreEvento: result.nombreEvento,
                fechaEvento: result.fechaEvento?.toISOString().split('T')[0] ?? '',
                horaInicio: result.horaInicio?.toISOString().split('T')[1]?.substring(0, 5) ?? '',
                responsableNombre: result.responsableNombre,
                editadoPor: 'solicitante',
            });
        }
        else if (usuario.rol === 'ADMIN' && solicitudActual?.estado === 'Aprobado') {
            const docente = solicitudActual.usuarioId
                ? await prisma.usuario.findUnique({ where: { id: solicitudActual.usuarioId }, select: { correo: true } })
                : null;
            if (docente?.correo) {
                await enviarCorreoModificacion({
                    folio: result.folio,
                    nombreEvento: result.nombreEvento,
                    fechaEvento: result.fechaEvento?.toISOString().split('T')[0] ?? '',
                    horaInicio: result.horaInicio?.toISOString().split('T')[1]?.substring(0, 5) ?? '',
                    responsableNombre: result.responsableNombre,
                    editadoPor: 'admin',
                    emailDocente: docente.correo,
                });
            }
        }
        res.json(result);
    }
    catch (error) {
        const statusCode = error.statusCode || 500;
        const message = statusCode === 500 ? 'Error interno del servidor' : error.message;
        if (statusCode === 500)
            console.error('Error al editar solicitud:', error);
        res.status(statusCode).json({ error: message });
    }
}
//# sourceMappingURL=solicitud.controller.js.map