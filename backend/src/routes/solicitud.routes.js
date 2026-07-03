import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { obtenerSolicitudes, obtenerSolicitudPorId, crearSolicitud, actualizarEstado, editarSolicitud, obtenerSolicitudPublica } from '../controllers/solicitud.controller.js';
const router = Router();
router.get('/publico/:id', obtenerSolicitudPublica);
router.use(authMiddleware);
router.get('/', obtenerSolicitudes);
router.get('/:id', obtenerSolicitudPorId);
router.post('/', crearSolicitud);
router.put('/:id', editarSolicitud);
router.patch('/:id/estado', actualizarEstado);
export default router;
//# sourceMappingURL=solicitud.routes.js.map