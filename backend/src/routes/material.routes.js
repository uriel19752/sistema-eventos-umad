import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { agregarMateriales, obtenerMaterialesPorSolicitud } from '../controllers/material.controller.js';
const router = Router();
router.use(authMiddleware);
router.post('/', agregarMateriales);
router.get('/solicitud/:solicitudId', obtenerMaterialesPorSolicitud);
export default router;
//# sourceMappingURL=material.routes.js.map