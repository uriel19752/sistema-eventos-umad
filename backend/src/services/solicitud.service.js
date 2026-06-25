import prisma from '../config/db.js';
import { TipoMaterial } from '../generated/prisma/client.js';
import { enviarAlertaNuevaSolicitud, enviarAlertaCancelacionTardia, enviarCorreoAprobacion, enviarCorreoCancelacion } from './mailService.js';
import { crearEventoSolicitud, eliminarEventoSolicitud } from './googleCalendarEvent.service.js';
const MS_IN_48_HOURS = 48 * 60 * 60 * 1000;
function formatDate(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function formatTime(d) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
function mapearMateriales(materiales) {
    const arr = [];
    if (materiales?.fotografias)
        arr.push({ tipoMaterial: TipoMaterial.Fotografia });
    if (materiales?.notaWeb)
        arr.push({ tipoMaterial: TipoMaterial.Nota_Web });
    if (materiales?.banners)
        arr.push({ tipoMaterial: TipoMaterial.Banner });
    if (materiales?.otro) {
        arr.push({ tipoMaterial: TipoMaterial.Otro, descripcionOtro: materiales.otro });
    }
    return arr;
}
async function mapearUbicacion(lugarSel) {
    if (lugarSel === 'UMAD') {
        const [inst, plan] = await Promise.all([
            prisma.institucion.findFirst({ where: { nombre: 'UMAD' } }),
            prisma.plantel.findFirst({ where: { nombre: 'UMAD Campus Puebla' } }),
        ]);
        return { institucionId: inst ? inst.id : null, plantelId: plan ? plan.id : null };
    }
    if (lugarSel === 'IMM Centro') {
        const [inst, plan] = await Promise.all([
            prisma.institucion.findFirst({ where: { nombre: 'IMM' } }),
            prisma.plantel.findFirst({ where: { nombre: 'IMM Campus Centro' } }),
        ]);
        return { institucionId: inst ? inst.id : null, plantelId: plan ? plan.id : null };
    }
    if (lugarSel === 'IMM Zavaleta') {
        const [inst, plan] = await Promise.all([
            prisma.institucion.findFirst({ where: { nombre: 'IMM' } }),
            prisma.plantel.findFirst({ where: { nombre: 'IMM Campus Zavaleta' } }),
        ]);
        return { institucionId: inst ? inst.id : null, plantelId: plan ? plan.id : null };
    }
    return { plantelId: null, institucionId: null };
}
const ESTADOS_VALIDOS = ['Pendiente', 'Aprobado', 'Completada', 'Cancelada'];
export async function crearSolicitud(data, usuario) {
    console.log('=== INICIANDO INSERCIÓN RELACIONAL DE SOLICITUD Y MATERIALES ===');
    const materialesArray = mapearMateriales(data.materiales);
    const lugarSel = data.lugarSeleccionado || '';
    const { plantelId: finalPlantelId, institucionId: finalInstitucionId } = await mapearUbicacion(lugarSel);
    const solicitud = await prisma.solicitudEvento.create({
        data: {
            folio: data.folio,
            nombreEvento: data.nombreEvento,
            descripcion: data.descripcion || '',
            objetivoCobertura: data.objetivo || '',
            publicoObjetivo: data.publico || '',
            autoridadesAsistentes: data.autoridades || '',
            plantelId: finalPlantelId,
            institucionId: finalInstitucionId,
            lugarEspecifico: lugarSel === 'Lugar Externo' ? 'Lugar Externo' : `${data.lugar} - ${data.ubicacion}`,
            fechaEvento: new Date(`${data.fechaEvento}T00:00:00.000Z`),
            horaInicio: new Date(`1970-01-01T${data.horaInicio}:00.000Z`),
            horaFin: new Date(`1970-01-01T${data.horaFin}:00.000Z`),
            horaMontaje: data.horaMontaje ? new Date(`1970-01-01T${data.horaMontaje}:00.000Z`) : null,
            responsableNombre: data.responsableNombre || 'Responsable no asignado',
            contacto: data.contacto || '',
            departamentoSolicitante: data.area || '',
            observaciones: data.observaciones || null,
            prioridad: 'Media',
            estado: 'Pendiente',
            usuarioId: usuario.id,
            materialSolicitado: {
                create: materialesArray,
            },
        },
    });
    console.log(`[AUTH] Usuario autenticado asociado a solicitud: ID ${usuario.id}`);
    enviarAlertaNuevaSolicitud({
        folio: solicitud.folio,
        nombreEvento: solicitud.nombreEvento,
        fechaEvento: formatDate(solicitud.fechaEvento),
        horaInicio: formatTime(solicitud.horaInicio),
        responsableNombre: solicitud.responsableNombre,
        departamentoSolicitante: solicitud.departamentoSolicitante ?? '',
        contacto: solicitud.contacto ?? '',
    }).catch((e) => console.error('[MAIL] Error enviando correo', e));
    return solicitud;
}
export async function obtenerSolicitudes(usuario) {
    const isAdmin = usuario.rol === 'ADMIN';
    console.log(isAdmin
        ? '[AUTH] Usuario ADMIN accediendo a todas las solicitudes'
        : '[AUTH] Usuario USER accediendo a sus solicitudes');
    const where = isAdmin ? {} : { usuarioId: usuario.id };
    const solicitudes = await prisma.solicitudEvento.findMany({
        where,
        select: {
            id: true,
            folio: true,
            nombreEvento: true,
            descripcion: true,
            objetivoCobertura: true,
            publicoObjetivo: true,
            autoridadesAsistentes: true,
            lugarEspecifico: true,
            ubicacion: true,
            fechaEvento: true,
            horaInicio: true,
            horaFin: true,
            horaMontaje: true,
            responsableNombre: true,
            contacto: true,
            departamentoSolicitante: true,
            observaciones: true,
            prioridad: true,
            estado: true,
            fechaSolicitud: true,
            googleEventId: true,
            googleEventLink: true,
            plantelId: true,
            institucionId: true,
            plantel: true,
            institucion: true,
            usuarioId: true,
            usuario: {
                select: { id: true, correo: true, rol: true },
            },
        },
        orderBy: {
            fechaSolicitud: 'desc',
        },
    });
    return solicitudes;
}
export async function obtenerSolicitudPorId(id, usuario) {
    if (!id) {
        throw Object.assign(new Error('ID inválido'), { statusCode: 400 });
    }
    const solicitud = await prisma.solicitudEvento.findUnique({
        where: { id },
        include: {
            plantel: true,
            institucion: true,
            materialSolicitado: true,
            usuario: {
                select: { id: true, correo: true, rol: true },
            },
        },
    });
    if (!solicitud) {
        throw Object.assign(new Error('Solicitud no encontrada'), { statusCode: 404 });
    }
    if (usuario.rol !== 'ADMIN' && solicitud.usuarioId !== usuario.id) {
        throw Object.assign(new Error('No tienes permiso para acceder a esta solicitud'), { statusCode: 403 });
    }
    return solicitud;
}
export async function actualizarEstado(id, data, usuario) {
    const { estado, motivo } = data;
    if (!id || !estado) {
        throw Object.assign(new Error('Faltan id y estado'), { statusCode: 400 });
    }
    if (!ESTADOS_VALIDOS.includes(estado)) {
        throw Object.assign(new Error(`Estado inválido. Debe ser: ${ESTADOS_VALIDOS.join(', ')}`), { statusCode: 400 });
    }
    const solicitudActual = await prisma.solicitudEvento.findUnique({
        where: { id },
        include: {
            usuario: {
                select: { id: true, correo: true, rol: true },
            },
        },
    });
    if (!solicitudActual) {
        throw Object.assign(new Error('Solicitud no encontrada'), { statusCode: 404 });
    }
    if (usuario.rol !== 'ADMIN' && solicitudActual.usuarioId !== usuario.id) {
        throw Object.assign(new Error('No tienes permiso para modificar esta solicitud'), { statusCode: 403 });
    }
    if (solicitudActual.estado === estado) {
        throw Object.assign(new Error('La solicitud ya se encuentra en ese estado'), { statusCode: 400 });
    }
    if (estado === 'Cancelada') {
        const fechaEventoStr = formatDate(solicitudActual.fechaEvento);
        const horaInicioStr = formatTime(solicitudActual.horaInicio);
        const fechaHoraEvento = new Date(`${fechaEventoStr}T${horaInicioStr}`);
        const tardia = (fechaHoraEvento.getTime() - Date.now()) < MS_IN_48_HOURS;
        const resultado = await prisma.$transaction(async (tx) => {
            const actualizada = await tx.solicitudEvento.update({
                where: { id },
                data: {
                    estado,
                    googleEventId: null,
                },
            });
            await tx.auditoriaCancelacion.create({
                data: {
                    solicitudId: id,
                    estadoAnterior: solicitudActual.estado,
                    motivo: motivo ? motivo.trim() : null,
                    tardia,
                },
            });
            return actualizada;
        });
        eliminarEventoSolicitud(solicitudActual.googleEventId);
        if (tardia) {
            enviarAlertaCancelacionTardia({
                folio: solicitudActual.folio,
                nombreEvento: solicitudActual.nombreEvento,
                fechaEvento: formatDate(solicitudActual.fechaEvento),
                horaInicio: formatTime(solicitudActual.horaInicio),
                responsableNombre: solicitudActual.responsableNombre,
                departamentoSolicitante: solicitudActual.departamentoSolicitante ?? '',
                contacto: solicitudActual.contacto ?? '',
                tardia,
            }).catch((e) => console.error('Error al enviar correo de cancelación:', e));
        }
        if (solicitudActual.usuario?.correo) {
            enviarCorreoCancelacion({
                destinatario: solicitudActual.usuario.correo,
                folio: solicitudActual.folio,
                nombreEvento: solicitudActual.nombreEvento,
                fechaEvento: formatDate(solicitudActual.fechaEvento),
                horaInicio: formatTime(solicitudActual.horaInicio),
                responsableNombre: solicitudActual.responsableNombre,
                ...(motivo ? { motivo } : {}),
            }).catch((e) => console.error('[MAIL] Error enviando correo de cancelación', e));
        }
        else {
            console.log('[MAIL] Solicitud sin usuario asociado. No se enviará correo.');
        }
        return resultado;
    }
    const actualizada = await prisma.solicitudEvento.update({
        where: { id },
        data: { estado },
    });
    if (estado === 'Aprobado') {
        crearEventoSolicitud(actualizada)
            .then((result) => {
            if (!result)
                return;
            return prisma.solicitudEvento.update({
                where: { id },
                data: { googleEventId: result.id, googleEventLink: result.htmlLink },
            });
        })
            .catch((e) => console.error('[Google Calendar] Error creando evento:', e));
        if (solicitudActual.usuario?.correo) {
            enviarCorreoAprobacion({
                destinatario: solicitudActual.usuario.correo,
                folio: solicitudActual.folio,
                nombreEvento: solicitudActual.nombreEvento,
                fechaEvento: formatDate(solicitudActual.fechaEvento),
                horaInicio: formatTime(solicitudActual.horaInicio),
                responsableNombre: solicitudActual.responsableNombre,
            }).catch((e) => console.error('[MAIL] Error enviando correo de aprobación', e));
        }
        else {
            console.log('[MAIL] Solicitud sin usuario asociado. No se enviará correo.');
        }
    }
    return actualizada;
}
//# sourceMappingURL=solicitud.service.js.map