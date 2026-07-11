import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { obtenerSolicitudes, obtenerSolicitudPorId, crearSolicitud, actualizarEstado, editarSolicitud, obtenerSolicitudPublica, asignarProveedores, exportarSolicitudPDF, subirCroquis } from '../controllers/solicitud.controller.js';
const router = Router();
router.get('/publico/:id', obtenerSolicitudPublica);
router.use(authMiddleware);
router.get('/', obtenerSolicitudes);
router.get('/:id', obtenerSolicitudPorId);
router.get('/:id/pdf', exportarSolicitudPDF);
router.post('/', crearSolicitud);
router.put('/:id', editarSolicitud);
router.patch('/:id/estado', actualizarEstado);
router.post('/:id/asignar-proveedores', asignarProveedores);
router.post('/:id/croquis', subirCroquis);
export default router;
//# sourceMappingURL=solicitud.routes.js.map