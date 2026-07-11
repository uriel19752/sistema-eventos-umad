/**
 * @file Rutas del módulo de Materiales Solicitados.
 *
 * Propósito global:
 *   Gestiona los insumos y equipos requeridos para cada evento de cobertura.
 *   Permite agregar materiales a una solicitud y consultar los existentes.
 *   Todas las rutas requieren autenticación JWT.
 *
 * Endpoints:
 *   - `POST /`                      — Agrega materiales a una solicitud.
 *   - `GET /solicitud/:solicitudId` — Obtiene los materiales de una solicitud.
 *
 * @module routes/material
 */

import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { agregarMateriales, obtenerMaterialesPorSolicitud } from '../controllers/material.controller.js'

const router = Router()

router.use(authMiddleware)

router.post('/', agregarMateriales)
router.get('/solicitud/:solicitudId', obtenerMaterialesPorSolicitud)

export default router
