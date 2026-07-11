import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware.js';
import { obtenerCatalogos } from '../controllers/catalogo.controller.js';
const router = Router();
router.use(authMiddleware);
router.get('/', obtenerCatalogos);
export default router;
//# sourceMappingURL=catalogo.routes.js.map