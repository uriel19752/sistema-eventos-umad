import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { obtenerResumenCancelaciones } from '../controllers/auditoria.controller.js'

const router = Router()

router.use(authMiddleware)

router.get('/cancelaciones', obtenerResumenCancelaciones)

export default router
