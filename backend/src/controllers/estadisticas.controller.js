import { obtenerDashboardEstadisticas } from "../services/estadisticas.service.js";
export async function obtenerDashboard(req, res) {
    try {
        const { plantel, institucion, fechaInicio, fechaFin } = req.query;
        const data = await obtenerDashboardEstadisticas({
            ...(plantel ? { plantel } : {}),
            ...(institucion ? { institucion } : {}),
            ...(fechaInicio ? { fechaInicio } : {}),
            ...(fechaFin ? { fechaFin } : {}),
            ...(req.usuario?.id ? { usuarioId: req.usuario.id } : {}),
            ...(req.usuario?.rol ? { rol: req.usuario.rol } : {}),
        });
        res.status(200).json(data);
    }
    catch (error) {
        const statusCode = error.statusCode || 500;
        const message = statusCode === 500
            ? "Error interno al obtener estadísticas"
            : error.message;
        if (statusCode === 500)
            console.error("Error al obtener dashboard:", error);
        res.status(statusCode).json({ error: message });
    }
}
//# sourceMappingURL=estadisticas.controller.js.map