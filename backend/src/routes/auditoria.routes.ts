/**
 * @file Rutas del módulo de Auditoría.
 *
 * Propósito global:
 *   Proporciona métricas históricas y reportes de cancelaciones para
 *   el seguimiento de calidad del servicio. Todas las rutas requieren
 *   autenticación JWT.
 *
 * Endpoints:
 *   - `GET /cancelaciones` — Resumen de cancelaciones (totales, tasas,
 *     motivos más frecuentes).
 *
 * @module routes/auditoria
 */

import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { obtenerResumenCancelaciones } from '../controllers/auditoria.controller.js'

const router = Router()

router.use(authMiddleware)

router.get('/cancelaciones', obtenerResumenCancelaciones)

export default router
