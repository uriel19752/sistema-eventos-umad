import type { Request, Response } from "express";
import {
  obtenerNotificacionesUsuario,
  marcarComoLeida,
  generarRecordatoriosAutomatizados,
} from "../services/notificacion.service.js";

export async function obtenerNotificaciones(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    await generarRecordatoriosAutomatizados();
    const usuarioId = req.usuario!.id;
    const notificaciones = await obtenerNotificacionesUsuario(usuarioId);
    res.status(200).json(notificaciones);
  } catch (error: any) {
    console.error("Error al obtener notificaciones:", error);
    res.status(500).json({ error: "Error interno al obtener notificaciones" });
  }
}

export async function marcarNotificacionLeida(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const usuarioId = req.usuario!.id;
    const id = Number(req.params.id);

    if (!id) {
      res.status(400).json({ error: "ID de notificación inválido" });
      return;
    }

    const result = await marcarComoLeida(id, usuarioId);

    if (result.count === 0) {
      res
        .status(404)
        .json({ error: "Notificación no encontrada o no autorizada" });
      return;
    }

    res.status(200).json({ mensaje: "Notificación marcada como leída" });
  } catch (error: any) {
    console.error("Error al marcar notificación como leída:", error);
    res
      .status(500)
      .json({ error: "Error interno al marcar notificación como leída" });
  }
}
