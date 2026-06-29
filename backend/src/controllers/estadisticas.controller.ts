import type { Request, Response } from "express";
import { obtenerDashboardEstadisticas } from "../services/estadisticas.service.js";

export async function obtenerDashboard(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { plantel, institucion, fechaInicio, fechaFin } = req.query as Record<string, string | undefined>;

    const data = await obtenerDashboardEstadisticas({
      ...(plantel ? { plantel } : {}),
      ...(institucion ? { institucion } : {}),
      ...(fechaInicio ? { fechaInicio } : {}),
      ...(fechaFin ? { fechaFin } : {}),
    });
    res.status(200).json(data);
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    const message =
      statusCode === 500
        ? "Error interno al obtener estadísticas"
        : error.message;
    if (statusCode === 500)
      console.error("Error al obtener dashboard:", error);
    res.status(statusCode).json({ error: message });
  }
}
