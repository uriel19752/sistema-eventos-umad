import prisma from "../config/db.js";
import { TipoMaterial, type Estado } from "../generated/prisma/client.js";
import type { CrearSolicitudDTO } from "../dto/crearSolicitud.dto.js";
import type { ActualizarEstadoDTO } from "../dto/actualizarEstado.dto.js";
import type { EditarSolicitudDTO } from "../dto/editarSolicitud.dto.js";
import {
  enviarAlertaNuevaSolicitud,
  enviarAlertaCancelacionTardia,
  enviarCorreoAprobacion,
  enviarCorreoCancelacion,
  enviarCorreoConfirmacionSolicitud,
  enviarNotificacionProveedor,
} from "./mailService.js";
import {
  actualizarEventoSolicitud,
  construirDescription,
  crearEventoSolicitud,
  eliminarEventoSolicitud,
} from "./googleCalendarEvent.service.js";
import { crearNotificacion } from "./notificacion.service.js";

const MS_IN_48_HOURS = 48 * 60 * 60 * 1000;

function formatDate(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
function formatTime(d: Date): string {
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const minutes = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

function mapearMateriales(materiales: CrearSolicitudDTO["materiales"]) {
  const arr: { tipoMaterial: TipoMaterial; descripcionOtro?: string }[] = [];
  if (materiales?.fotografias)
    arr.push({ tipoMaterial: TipoMaterial.Fotografia });
  if (materiales?.notaWeb) arr.push({ tipoMaterial: TipoMaterial.Nota_Web });
  if (materiales?.banners) arr.push({ tipoMaterial: TipoMaterial.Banner });
  if (materiales?.otro) {
    arr.push({
      tipoMaterial: TipoMaterial.Otro,
      descripcionOtro: materiales.otro,
    });
  }
  return arr;
}

const INSTITUCIONES_POR_LUGAR: Record<string, string> = {
  "UMAD": "UMAD",
  "IMM Centro": "IMM",
  "IMM Zavaleta": "IMM",
  "Prepa UMAD": "Prepa UMAD",
  "IMM Secundaria": "IMM Secundaria",
  "IMM Primaria": "IMM Primaria",
  "IMM Maternal": "IMM Maternal",
};

const PLANTELES_POR_LUGAR: Record<string, string> = {
  "UMAD": "UMAD Campus Puebla",
  "IMM Centro": "IMM Campus Centro",
  "IMM Zavaleta": "IMM Campus Zavaleta",
};

async function mapearUbicacion(
  lugarSel: string,
): Promise<{ plantelId: number | null; institucionId: number | null }> {
  const nombreInst = INSTITUCIONES_POR_LUGAR[lugarSel];
  const nombrePlantel = PLANTELES_POR_LUGAR[lugarSel];

  if (!nombreInst) {
    return { plantelId: null, institucionId: null };
  }

  const [inst, plan] = await Promise.all([
    prisma.institucion.findFirst({ where: { nombre: nombreInst } }),
    nombrePlantel
      ? prisma.plantel.findFirst({ where: { nombre: nombrePlantel } })
      : Promise.resolve(null),
  ]);

  return {
    institucionId: inst ? inst.id : null,
    plantelId: plan ? plan.id : null,
  };
}

const ESTADOS_VALIDOS = ["Pendiente", "Aprobado", "Completada", "Cancelada"];

export interface UsuarioAuth {
  id: number;
  email?: string;
  rol: "ADMIN" | "SOLICITANTE";
}

console.log("=== ENTRE A ACTUALIZAR ESTADO ===");

export async function crearSolicitud(
  data: CrearSolicitudDTO & { plantelId?: number; institucionId?: number; institucionPersonalizada?: string; datosEspecificos?: Record<string, unknown>; croquisUrl?: string },
  usuario: UsuarioAuth,
) {
  console.log(
    "=== INICIANDO INSERCIÓN RELACIONAL DE SOLICITUD Y MATERIALES ===",
  );

  const materialesArray = mapearMateriales(data.materiales);
  const lugarSel = data.lugarSeleccionado || "";

  const { plantelId: deducedPlantelId, institucionId: deducedInstitucionId } =
    await mapearUbicacion(lugarSel);

  const finalPlantelId = data.plantelId !== undefined ? Number(data.plantelId) : deducedPlantelId;
  const rawInstitucionId = data.institucionId !== undefined ? Number(data.institucionId) : deducedInstitucionId;
  const finalInstitucionId = rawInstitucionId === 0 ? null : rawInstitucionId;

  console.log('[VALIDACION HORAS]', {
    horaMontaje: data.horaMontaje,
    horaInicio: data.horaInicio,
    horaFin: data.horaFin
  })

  if (data.horaFin <= data.horaInicio) {
    throw Object.assign(new Error('La hora de finalización debe ser posterior a la hora de inicio.'), { statusCode: 400 })
  }

  if (data.horaMontaje && data.horaMontaje > data.horaInicio) {
    throw Object.assign(new Error('La hora de montaje debe ser anterior o igual a la hora de inicio.'), { statusCode: 400 })
  }

  const solicitud = await prisma.solicitudEvento.create({
    data: {
      folio: data.folio,
      nombreEvento: data.nombreEvento,
      descripcion: data.descripcion || "",
      objetivoCobertura: data.objetivo || "",
      publicoObjetivo: data.publico || "",
      autoridadesAsistentes: data.autoridades || "",
      plantelId: finalPlantelId,
      institucionId: finalInstitucionId,
      lugarEspecifico: data.lugar || "",
      ubicacion: data.ubicacion || null,
      fechaEvento: new Date(`${data.fechaEvento}T00:00:00.000Z`),
      horaInicio: new Date(`1970-01-01T${data.horaInicio}:00.000Z`),
      horaFin: new Date(`1970-01-01T${data.horaFin}:00.000Z`),
      horaMontaje: data.horaMontaje
        ? new Date(`1970-01-01T${data.horaMontaje}:00.000Z`)
        : null,
      responsableNombre: data.responsableNombre || "Responsable no asignado",
      contacto: data.contacto || "",
      departamentoSolicitante: data.area || "",
      observaciones: data.observaciones || null,
      institucionPersonalizada: data.institucionPersonalizada || null,
      datosEspecificos: data.datosEspecificos as any ?? undefined,
      croquisUrl: data.croquisUrl ?? null,
      prioridad: "Media",
      estado: "Pendiente",
      usuarioId: usuario.id,
      materialSolicitado: {
        create: materialesArray,
      },
    },
  });

  console.log(
    `[AUTH] Usuario autenticado asociado a solicitud: ID ${usuario.id}`,
  );

  enviarAlertaNuevaSolicitud({
    solicitudId: solicitud.id,
    folio: solicitud.folio,
    nombreEvento: solicitud.nombreEvento,
    fechaEvento: formatDate(solicitud.fechaEvento),
    horaInicio: formatTime(solicitud.horaInicio),
    responsableNombre: solicitud.responsableNombre,
    departamentoSolicitante: solicitud.departamentoSolicitante ?? "",
    contacto: solicitud.contacto ?? "",
  }).catch((e: any) => console.error("[MAIL] Error enviando correo", e));

  prisma.usuario
    .findUnique({
      where: { id: usuario.id },
      select: { email: true },
    })
    .then((creador) => {
      console.log("[MAIL] Email destinatario (creador):", creador?.email);
      if (creador?.email) {
        enviarCorreoConfirmacionSolicitud({
          destinatario: creador.email,
          solicitudId: solicitud.id,
          folio: solicitud.folio,
          nombreEvento: solicitud.nombreEvento,
          fechaEvento: formatDate(solicitud.fechaEvento),
          horaInicio: formatTime(solicitud.horaInicio),
          responsableNombre: solicitud.responsableNombre,
        }).catch((e: any) =>
          console.error("[MAIL] Error enviando confirmación al solicitante", e),
        );
      } else {
        console.log("[MAIL] Creador sin email. No se envió confirmación.");
      }
    })
    .catch((e: any) =>
      console.error("[MAIL] Error buscando creador para confirmación", e),
    );

  prisma.usuario
    .findMany({ where: { rol: "ADMIN" }, select: { id: true } })
    .then((admins) => {
      for (const admin of admins) {
        crearNotificacion(
          admin.id,
          "Nueva solicitud registrada",
          `Se ha registrado el evento "${solicitud.nombreEvento}" con folio ${solicitud.folio}.`,
        ).catch((e) =>
          console.error("[NOTIFICACION] Error creando notificación", e),
        );
      }
    })
    .catch((e) =>
      console.error("[NOTIFICACION] Error buscando administradores", e),
    );

  return solicitud;
}

export async function obtenerSolicitudes(usuario: UsuarioAuth) {
  const isAdmin = usuario.rol === "ADMIN";

  console.log(
    isAdmin
      ? "[AUTH] Usuario ADMIN accediendo a todas las solicitudes"
      : "[AUTH] Usuario USER accediendo a sus solicitudes",
  );

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
      datosEspecificos: true,
      croquisUrl: true,
      plantelId: true,
      institucionId: true,
      plantel: true,
      institucion: true,
      usuarioId: true,
      usuario: {
        select: { id: true, email: true, rol: true },
      },
    },
    orderBy: {
      fechaSolicitud: "desc",
    },
  });

  return solicitudes;
}

export async function obtenerSolicitudPorId(id: number, usuario: UsuarioAuth) {
  if (!id) {
    throw Object.assign(new Error("ID inválido"), { statusCode: 400 });
  }

  const solicitud = await prisma.solicitudEvento.findUnique({
    where: { id },
    include: {
      plantel: true,
      institucion: true,
      materialSolicitado: true,
      usuario: {
        select: { id: true, email: true, rol: true },
      },
    },
  });

  if (!solicitud) {
    throw Object.assign(new Error("Solicitud no encontrada"), {
      statusCode: 404,
    });
  }

  if (usuario.rol !== "ADMIN" && solicitud.usuarioId !== usuario.id) {
    throw Object.assign(
      new Error("No tienes permiso para acceder a esta solicitud"),
      { statusCode: 403 },
    );
  }

  return solicitud;
}

export async function actualizarEstado(
  id: number,
  data: ActualizarEstadoDTO,
  usuario: UsuarioAuth,
) {
  const { estado, motivo, forzar } = data;

  if (!id || !estado) {
    throw Object.assign(new Error("Faltan id y estado"), { statusCode: 400 });
  }

  if (!ESTADOS_VALIDOS.includes(estado)) {
    throw Object.assign(
      new Error(`Estado inválido. Debe ser: ${ESTADOS_VALIDOS.join(", ")}`),
      { statusCode: 400 },
    );
  }

  const solicitudActual = await prisma.solicitudEvento.findUnique({
    where: { id },
    include: {
      usuario: {
        select: { id: true, email: true, rol: true },
      },
    },
  });

  if (!solicitudActual) {
    throw Object.assign(new Error("Solicitud no encontrada"), {
      statusCode: 404,
    });
  }

  if (usuario.rol !== "ADMIN" && solicitudActual.usuarioId !== usuario.id) {
    throw Object.assign(
      new Error("No tienes permiso para modificar esta solicitud"),
      { statusCode: 403 },
    );
  }

  if (solicitudActual.estado === estado) {
    throw Object.assign(
      new Error("La solicitud ya se encuentra en ese estado"),
      { statusCode: 400 },
    );
  }

  if (estado === "Aprobado" && !forzar && solicitudActual.plantelId) {
    console.log("=== VALIDACION DE CONFLICTOS ===");
    console.log("Estado:", estado);
    console.log("Forzar:", forzar);
    console.log("PlantelId:", solicitudActual.plantelId);
    console.log("Fecha:", solicitudActual.fechaEvento);
    console.log("Hora Inicio:", solicitudActual.horaInicio);
    console.log("Hora Fin:", solicitudActual.horaFin);

    const conflictos = await prisma.solicitudEvento.findMany({
      where: {
        id: { not: id },
        estado: "Aprobado",
        plantelId: solicitudActual.plantelId,
        fechaEvento: solicitudActual.fechaEvento,
      },
      select: {
        id: true,
        nombreEvento: true,
        horaInicio: true,
        horaFin: true,
      },
    });

    const nuevosInicio = solicitudActual.horaInicio.getTime();
    const nuevosFin = solicitudActual.horaFin.getTime();
    const conflictosReales = conflictos.filter((c) => {
      const existenteInicio = c.horaInicio.getTime();
      const existenteFin = c.horaFin.getTime();
      return nuevosInicio < existenteFin && nuevosFin > existenteInicio;
    });

    console.log(
      "[DEBUG CONFLICTO] conflictos encontrados (misma fecha/plantel):",
      conflictos.length,
    );
    console.log(
      "[DEBUG CONFLICTO] conflictosReales (overlap horario):",
      conflictosReales.length,
    );
    if (conflictosReales.length > 0) {
      console.log(
        "[DEBUG CONFLICTO] contenido conflictosReales:",
        JSON.stringify(
          conflictosReales.map((c) => ({
            id: c.id,
            nombreEvento: c.nombreEvento,
            horaInicio: c.horaInicio.toISOString(),
            horaFin: c.horaFin.toISOString(),
          })),
        ),
      );
      const conflictData = conflictosReales.map((c) => ({
        id: c.id,
        nombreEvento: c.nombreEvento,
        horaInicio: formatTime(c.horaInicio),
        horaFin: formatTime(c.horaFin),
      }));
      const err: any = new Error("Existen eventos en conflicto");
      err.statusCode = 409;
      err.warning = true;
      err.conflictos = conflictData;
      throw err;
    }
  }

  if (estado === "Cancelada") {
    const fechaEventoStr = formatDate(solicitudActual.fechaEvento);
    const horaInicioStr = formatTime(solicitudActual.horaInicio);
    const fechaHoraEvento = new Date(`${fechaEventoStr}T${horaInicioStr}`);
    const tardia = fechaHoraEvento.getTime() - Date.now() < MS_IN_48_HOURS;

    const proveedoresCancelacion = await prisma.asignacionProveedor.findMany({
      where: { solicitudId: id },
      include: { proveedor: true },
    })

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
        solicitudId: solicitudActual.id,
        folio: solicitudActual.folio,
        nombreEvento: solicitudActual.nombreEvento,
        fechaEvento: formatDate(solicitudActual.fechaEvento),
        horaInicio: formatTime(solicitudActual.horaInicio),
        responsableNombre: solicitudActual.responsableNombre,
        departamentoSolicitante: solicitudActual.departamentoSolicitante ?? "",
        contacto: solicitudActual.contacto ?? "",
        tardia,
      }).catch((e) =>
        console.error("Error al enviar correo de cancelación:", e),
      );
    }

    if (solicitudActual.usuario?.email) {
      enviarCorreoCancelacion({
        destinatario: solicitudActual.usuario.email,
        solicitudId: solicitudActual.id,
        folio: solicitudActual.folio,
        nombreEvento: solicitudActual.nombreEvento,
        fechaEvento: formatDate(solicitudActual.fechaEvento),
        horaInicio: formatTime(solicitudActual.horaInicio),
        responsableNombre: solicitudActual.responsableNombre,
        ...(motivo ? { motivo } : {}),
      }).catch((e) =>
        console.error("[MAIL] Error enviando correo de cancelación", e),
      );
    } else {
      console.log(
        "[MAIL] Solicitud sin usuario asociado. No se enviará correo.",
      );
    }

    if (solicitudActual.usuarioId) {
      crearNotificacion(
        solicitudActual.usuarioId,
        "Solicitud cancelada",
        `Tu evento "${solicitudActual.nombreEvento}" (folio ${solicitudActual.folio}) ha sido cancelado.`,
      ).catch((e) =>
        console.error("[NOTIFICACION] Error creando notificación", e),
      );
    }

    for (const ap of proveedoresCancelacion) {
      if (ap.proveedor.email) {
        enviarNotificacionProveedor('cancelacion', {
          proveedorNombre: ap.proveedor.nombre,
          proveedorEmail: ap.proveedor.email,
          folio: solicitudActual.folio,
          nombreEvento: solicitudActual.nombreEvento,
          fechaEvento: formatDate(solicitudActual.fechaEvento),
          horaInicio: formatTime(solicitudActual.horaInicio),
          horaFin: formatTime(solicitudActual.horaFin),
          lugar: solicitudActual.lugarEspecifico ?? '',
          responsable: solicitudActual.responsableNombre,
          contacto: solicitudActual.contacto ?? '',
        }).catch((e) =>
          console.error(`[MAIL] Error al notificar cancelación a ${ap.proveedor.email}:`, e),
        )
      }
    }

    return resultado;
  }

  const actualizada = await prisma.solicitudEvento.update({
    where: { id },
    data: { estado },
    include: {
      materialSolicitado: {
        select: { tipoMaterial: true, descripcionOtro: true },
      },
      usuario: {
        select: { email: true },
      },
    },
  });

  if (estado === "Aprobado") {
    crearEventoSolicitud(actualizada)
      .then((result) => {
        if (!result) return;
        return prisma.solicitudEvento.update({
          where: { id },
          data: { googleEventId: result.id, googleEventLink: result.htmlLink },
        });
      })
      .catch((e) =>
        console.error("[Google Calendar] Error creando evento:", e),
      );

    if (solicitudActual.usuario?.email) {
      const descripcionCompleta = construirDescription(actualizada)
      enviarCorreoAprobacion({
        destinatario: solicitudActual.usuario.email,
        solicitudId: solicitudActual.id,
        folio: solicitudActual.folio,
        nombreEvento: solicitudActual.nombreEvento,
        fechaEvento: formatDate(solicitudActual.fechaEvento),
        horaInicio: formatTime(solicitudActual.horaInicio),
        horaFin: formatTime(solicitudActual.horaFin),
        lugarEspecifico: solicitudActual.lugarEspecifico ?? '',
        responsableNombre: solicitudActual.responsableNombre,
        descripcionCompleta,
      }).catch((e) =>
        console.error("[MAIL] Error enviando correo de aprobación", e),
      );
    } else {
      console.log(
        "[MAIL] Solicitud sin usuario asociado. No se enviará correo.",
      );
    }
  }

  if (solicitudActual.usuarioId) {
    crearNotificacion(
      solicitudActual.usuarioId,
      "Estado de solicitud actualizado",
      `Tu evento "${solicitudActual.nombreEvento}" (folio ${solicitudActual.folio}) ha cambiado a: ${estado}.`,
    ).catch((e) =>
      console.error("[NOTIFICACION] Error creando notificación", e),
    );
  }

  return actualizada;
}

export async function editarSolicitud(
  id: number,
  data: EditarSolicitudDTO,
  usuario: UsuarioAuth,
) {
  if (!id) {
    throw Object.assign(new Error("ID inválido"), { statusCode: 400 });
  }

  const solicitudActual = await prisma.solicitudEvento.findUnique({
    where: { id },
    include: {
      materialSolicitado: true,
      usuario: {
        select: { email: true },
      },
    },
  });

  if (!solicitudActual) {
    throw Object.assign(new Error("Solicitud no encontrada"), {
      statusCode: 404,
    });
  }

  if (usuario.rol !== "ADMIN" && solicitudActual.usuarioId !== usuario.id) {
    throw Object.assign(
      new Error("No tienes permiso para modificar esta solicitud"),
      { statusCode: 403 },
    );
  }

  if (
    solicitudActual.estado === "Completada" ||
    solicitudActual.estado === "Cancelada"
  ) {
    throw Object.assign(
      new Error("No se puede editar una solicitud Completada o Cancelada"),
      { statusCode: 400 },
    );
  }

  if (data.horaFin && data.horaInicio && data.horaFin <= data.horaInicio) {
    throw Object.assign(new Error("La hora de finalización debe ser posterior a la hora de inicio."), { statusCode: 400 });
  }

  if (data.horaMontaje && data.horaInicio && data.horaMontaje > data.horaInicio) {
    throw Object.assign(new Error("La hora de montaje debe ser anterior o igual a la hora de inicio."), { statusCode: 400 });
  }

  const fechaEvento = data.fechaEvento
    ? new Date(`${data.fechaEvento}T00:00:00.000Z`)
    : undefined;

  const horaInicio = data.horaInicio
    ? new Date(`1970-01-01T${data.horaInicio}:00.000Z`)
    : undefined;

  const horaFin = data.horaFin
    ? new Date(`1970-01-01T${data.horaFin}:00.000Z`)
    : undefined;

  const horaMontaje = data.horaMontaje
    ? new Date(`1970-01-01T${data.horaMontaje}:00.000Z`)
    : undefined;

  const lugarSel = data.lugarSeleccionado;

  let deducedPlantelId: number | null | undefined;
  let deducedInstitucionId: number | null | undefined;

  if (lugarSel !== undefined) {
    const ubicacion = await mapearUbicacion(lugarSel);
    deducedPlantelId = ubicacion.plantelId;
    deducedInstitucionId = ubicacion.institucionId;
  }

  const finalPlantelId =
    data.plantelId !== undefined
      ? Number(data.plantelId)
      : deducedPlantelId !== undefined
        ? deducedPlantelId
        : solicitudActual.plantelId;

  const rawInstitucionEdit =
    data.institucionId !== undefined
      ? Number(data.institucionId)
      : deducedInstitucionId !== undefined
        ? deducedInstitucionId
        : solicitudActual.institucionId;

  const finalInstitucionId = rawInstitucionEdit === 0 ? null : rawInstitucionEdit;

  if (data.materiales) {
    const materialesArray = mapearMateriales(data.materiales);

    await prisma.materialSolicitado.deleteMany({
      where: { solicitudId: id },
    });

    if (materialesArray.length > 0) {
      await prisma.materialSolicitado.createMany({
        data: materialesArray.map((m) => ({
          solicitudId: id,
          tipoMaterial: m.tipoMaterial,
          descripcionOtro: m.descripcionOtro ?? null,
        })),
      });
    }
  }

  const solicitudActualizada = await prisma.solicitudEvento.update({
    where: { id },
    data: {
      ...(data.folio !== undefined && { folio: data.folio }),
      ...(data.nombreEvento !== undefined && { nombreEvento: data.nombreEvento }),
      ...(data.descripcion !== undefined && { descripcion: data.descripcion }),
      ...(data.objetivo !== undefined && { objetivoCobertura: data.objetivo }),
      ...(data.publico !== undefined && { publicoObjetivo: data.publico }),
      ...(data.autoridades !== undefined && { autoridadesAsistentes: data.autoridades }),
      ...(data.lugar !== undefined && { lugarEspecifico: data.lugar }),
      ...(data.ubicacion !== undefined && { ubicacion: data.ubicacion }),
      ...(fechaEvento !== undefined && { fechaEvento }),
      ...(horaInicio !== undefined && { horaInicio }),
      ...(horaFin !== undefined && { horaFin }),
      ...(horaMontaje !== undefined && { horaMontaje }),
      ...(data.responsableNombre !== undefined && { responsableNombre: data.responsableNombre }),
      ...(data.contacto !== undefined && { contacto: data.contacto }),
      ...(data.area !== undefined && { departamentoSolicitante: data.area }),
      ...(data.observaciones !== undefined && { observaciones: data.observaciones }),
      ...(data.institucionPersonalizada !== undefined && { institucionPersonalizada: data.institucionPersonalizada }),
      ...(data.datosEspecificos !== undefined && { datosEspecificos: data.datosEspecificos as any }),
      ...(data.croquisUrl !== undefined && { croquisUrl: data.croquisUrl }),
      plantelId: finalPlantelId,
      institucionId: finalInstitucionId,
    },
    include: {
      plantel: true,
      institucion: true,
      materialSolicitado: true,
    },
  });

  if (solicitudActual.estado === "Aprobado" && solicitudActual.googleEventId) {
    actualizarEventoSolicitud(solicitudActual.googleEventId, solicitudActualizada)
      .catch((e) => console.error("[Google Calendar] Error actualizando evento en edicion:", e))
  }

  if (usuario.rol === "ADMIN") {
    if (solicitudActual.usuarioId) {
      crearNotificacion(
        solicitudActual.usuarioId,
        "Solicitud modificada por administrador",
        `Tu evento "${solicitudActual.nombreEvento}" (folio ${solicitudActual.folio}) fue modificado por un administrador.`,
      ).catch((e) =>
        console.error("[NOTIFICACION] Error creando notificación", e),
      );
    }
  } else {
    prisma.usuario
      .findMany({ where: { rol: "ADMIN" }, select: { id: true } })
      .then((admins) => {
        for (const admin of admins) {
          crearNotificacion(
            admin.id,
            "Solicitud actualizada por el solicitante",
            `El solicitante actualizó los datos del evento "${solicitudActual.nombreEvento}" (folio ${solicitudActual.folio}).`,
          ).catch((e) =>
            console.error("[NOTIFICACION] Error creando notificación", e),
          );
        }
      })
      .catch((e) =>
        console.error("[NOTIFICACION] Error buscando administradores", e),
      );
  }

  return solicitudActualizada;
}

export async function asignarProveedores(
  solicitudId: number,
  proveedorIds: number[],
) {
  return prisma.$transaction(async (tx) => {
    await tx.asignacionProveedor.deleteMany({ where: { solicitudId } })

    if (proveedorIds.length > 0) {
      await tx.asignacionProveedor.createMany({
        data: proveedorIds.map((proveedorId) => ({ solicitudId, proveedorId })),
      })
    }

    return tx.asignacionProveedor.findMany({
      where: { solicitudId },
      include: { proveedor: true },
    })
  })
}
