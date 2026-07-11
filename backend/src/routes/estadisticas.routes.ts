/**
 * @file Rutas del módulo de Estadísticas / Dashboard.
 *
 * Propósito global:
 *   Proporciona los datos agregados para el dashboard analítico del frontend.
 *   Incluye métricas de rendimiento, tendencias, distribución por plantel/
 *   institución y exportaciones PDF/Excel. Todas las rutas requieren
 *   autenticación JWT.
 *
 * Endpoints:
 *   - `GET /dashboard`   — Dashboard completo con todas las métricas.
 *   - `GET /export/pdf`  — Exporta el dashboard a PDF descargable.
 *   - `GET /export/excel`— Exporta el dashboard a archivo XLSX.
 *
 * @module routes/estadisticas
 */

import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { obtenerDashboard } from "../controllers/estadisticas.controller.js";
import { exportarPDF, exportarExcel } from "../controllers/exportar.controller.js";

const router = Router();

router.use(authMiddleware);

router.get("/dashboard", obtenerDashboard);
router.get("/export/pdf", exportarPDF);
router.get("/export/excel", exportarExcel);

export default router;
