import { Router } from 'express'
import { registrarEncuesta, obtenerEncuestasPorEvento, obtenerResumenGlobal } from '../controllers/encuesta.controller.js'

const router = Router()

router.post('/', registrarEncuesta)
router.get('/global', obtenerResumenGlobal)
router.get('/solicitud/:solicitudId', obtenerEncuestasPorEvento)

export default router
