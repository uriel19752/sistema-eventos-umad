import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { registrarEncuesta, obtenerEncuestasPorEvento, obtenerResumenGlobal, obtenerTodasEncuestas } from '../controllers/encuesta.controller.js';
const router = Router();
// Ruta pública — no requiere autenticación (encuestados externos)
router.post('/', registrarEncuesta);
// Rutas protegidas — solo usuarios autenticados
router.use(authMiddleware);
router.get('/global', obtenerResumenGlobal);
router.get('/todas', obtenerTodasEncuestas);
router.get('/solicitud/:solicitudId', obtenerEncuestasPorEvento);
export default router;
//# sourceMappingURL=encuesta.routes.js.map