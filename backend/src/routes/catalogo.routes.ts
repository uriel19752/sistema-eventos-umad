import { Router } from 'express'
import { obtenerCatalogos } from '../controllers/catalogo.controller.js'

const router = Router()

router.get('/', obtenerCatalogos)

export default router
