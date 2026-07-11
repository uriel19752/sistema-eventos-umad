import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { exportarPDF, exportarExcel } from "../controllers/reportes.controller.js";
const router = Router();
router.use(authMiddleware);
router.get("/satisfaccion/pdf", exportarPDF);
router.get("/satisfaccion/excel", exportarExcel);
export default router;
//# sourceMappingURL=reportes.routes.js.map