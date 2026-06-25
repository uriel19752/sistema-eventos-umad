import { Router } from 'express'
import { registrarEncuesta, obtenerEncuestasPorEvento, obtenerResumenGlobal, obtenerTodasEncuestas } from '../controllers/encuesta.controller.js'

const router = Router()

router.post('/', registrarEncuesta)
router.get('/global', obtenerResumenGlobal)
router.get('/todas', obtenerTodasEncuestas)
router.get('/solicitud/:solicitudId', obtenerEncuestasPorEvento)

export default router
