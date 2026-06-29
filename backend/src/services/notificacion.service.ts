import prisma from "../config/db.js";

export async function crearNotificacion(
  usuarioId: number,
  titulo: string,
  mensaje: string,
) {
  return prisma.notificacion.create({
    data: { usuarioId, titulo, mensaje },
  });
}

export async function obtenerNotificacionesUsuario(usuarioId: number) {
  return prisma.notificacion.findMany({
    where: { usuarioId },
    orderBy: { fechaCreacion: "desc" },
  });
}

export async function marcarComoLeida(id: number, usuarioId: number) {
  return prisma.notificacion.updateMany({
    where: { id, usuarioId },
    data: { leida: true },
  });
}

export async function generarRecordatoriosAutomatizados() {
  const manana = new Date();
  manana.setDate(manana.getDate() + 1);
  const inicioManana = new Date(
    manana.getFullYear(),
    manana.getMonth(),
    manana.getDate(),
  );
  const finManana = new Date(inicioManana);
  finManana.setDate(finManana.getDate() + 1);

  const solicitudesManana = await prisma.solicitudEvento.findMany({
    where: {
      estado: "Aprobado",
      fechaEvento: { gte: inicioManana, lt: finManana },
    },
    select: { id: true, folio: true, nombreEvento: true, usuarioId: true },
  });

  if (solicitudesManana.length === 0) return;

  const admins = await prisma.usuario.findMany({
    where: { rol: "ADMIN" },
    select: { id: true },
  });

  const hoyInicio = new Date();
  hoyInicio.setHours(0, 0, 0, 0);

  const todosLosDestinos = [
    ...new Set([
      ...solicitudesManana
        .map((s) => s.usuarioId)
        .filter((id): id is number => id !== null),
      ...admins.map((a) => a.id),
    ]),
  ];

  const notisHoy = await prisma.notificacion.findMany({
    where: {
      titulo: "⏰ Recordatorio de Evento",
      fechaCreacion: { gte: hoyInicio },
      usuarioId: { in: todosLosDestinos },
    },
    select: { usuarioId: true, mensaje: true },
  });

  const yaNotificados = new Set<string>();
  for (const n of notisHoy) {
    const match = n.mensaje.match(/\(folio ([^)]+)\)/);
    if (match) yaNotificados.add(`${n.usuarioId}:${match[1]}`);
  }

  for (const solicitud of solicitudesManana) {
    const targets = [
      ...(solicitud.usuarioId ? [solicitud.usuarioId] : []),
      ...admins.map((a) => a.id),
    ];
    const uniqueTargets = [...new Set(targets)];

    for (const usuarioId of uniqueTargets) {
      if (yaNotificados.has(`${usuarioId}:${solicitud.folio}`)) continue;

      await crearNotificacion(
        usuarioId,
        "⏰ Recordatorio de Evento",
        `El evento "${solicitud.nombreEvento}" (folio ${solicitud.folio}) está programado para mañana. ¡No olvides revisar los detalles!`,
      );
    }
  }
}
