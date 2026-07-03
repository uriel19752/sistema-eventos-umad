import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import { obtenerNotificaciones, marcarNotificacionLeida, } from "../controllers/notificacion.controller.js";
const router = Router();
router.use(authMiddleware);
router.get("/", obtenerNotificaciones);
router.patch("/:id/leida", marcarNotificacionLeida);
export default router;
//# sourceMappingURL=notificacion.routes.js.map