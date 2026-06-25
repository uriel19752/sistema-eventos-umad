import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { obtenerEventosCalendario } from '../controllers/calendario.controller.js'

const router = Router()

router.use(authMiddleware)

router.get('/eventos', obtenerEventosCalendario)

export default router
