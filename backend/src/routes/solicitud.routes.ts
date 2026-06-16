import { Router } from 'express'
import { obtenerSolicitudes, obtenerSolicitudPorId, crearSolicitud, actualizarEstado } from '../controllers/solicitud.controller.js'

const router = Router()

router.get('/', obtenerSolicitudes)
router.get('/:id', obtenerSolicitudPorId)
router.post('/', crearSolicitud)
router.patch('/:id/estado', actualizarEstado)

export default router
