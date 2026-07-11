/**
 * @file Rutas del módulo de Catálogos.
 *
 * Propósito global:
 *   Agrupa la consulta de datos maestros (planteles, instituciones,
 *   tipos de evento, etc.) utilizados por los formularios del frontend.
 *   Todas las rutas requieren autenticación JWT.
 *
 * Endpoints:
 *   - `GET /` — Obtiene todos los catálogos en una sola respuesta.
 *
 * @module routes/catalogo
 */

import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { obtenerCatalogos } from '../controllers/catalogo.controller.js'

const router = Router()

router.use(authMiddleware)

router.get('/', obtenerCatalogos)

export default router
