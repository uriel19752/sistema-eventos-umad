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
