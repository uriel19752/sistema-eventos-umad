import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { obtenerSolicitudes, obtenerSolicitudPorId, crearSolicitud, actualizarEstado } from '../controllers/solicitud.controller.js'

const router = Router()

router.use(authMiddleware)

router.get('/', obtenerSolicitudes)
router.get('/:id', obtenerSolicitudPorId)
router.post('/', crearSolicitud)
router.patch('/:id/estado', actualizarEstado)

export default router
