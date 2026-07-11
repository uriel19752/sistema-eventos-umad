/**
 * @file Rutas del módulo de Reportes de Satisfacción.
 *
 * Propósito global:
 *   Exporta reportes detallados de encuestas de satisfacción en formatos
 *   PDF y Excel. Separa la lógica de exportación de la lógica de dashboard
 *   para mantener responsabilidades únicas. Todas las rutas requieren
 *   autenticación JWT.
 *
 * Endpoints:
 *   - `GET /satisfaccion/pdf`   — Reporte PDF de encuestas.
 *   - `GET /satisfaccion/excel` — Reporte Excel (XLSX) de encuestas.
 *
 * @module routes/reportes
 */

import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { exportarPDF, exportarExcel } from "../controllers/reportes.controller.js";

const router = Router();

router.use(authMiddleware);

router.get("/satisfaccion/pdf", exportarPDF);
router.get("/satisfaccion/excel", exportarExcel);

export default router;
