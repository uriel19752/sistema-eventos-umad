import { Router } from 'express';
import { obtenerResumenCancelaciones } from '../controllers/auditoria.controller.js';
const router = Router();
router.get('/cancelaciones', obtenerResumenCancelaciones);
export default router;
//# sourceMappingURL=auditoria.routes.js.map