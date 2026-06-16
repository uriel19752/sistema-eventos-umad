import { Router } from 'express'
import { agregarMateriales, obtenerMaterialesPorSolicitud } from '../controllers/material.controller.js'

const router = Router()

router.post('/', agregarMateriales)
router.get('/solicitud/:solicitudId', obtenerMaterialesPorSolicitud)

export default router
