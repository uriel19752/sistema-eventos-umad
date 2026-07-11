/**
 * @file Rutas del módulo de Encuestas de Satisfacción (CSAT).
 *
 * Propósito global:
 *   Gestiona el registro de encuestas de satisfacción asociadas a eventos
 *   cubiertos. La ruta `POST /` es pública (respondida por asistentes externos
 *   al evento), mientras que las rutas de consulta requieren autenticación.
 *   Esta es la única excepción en el sistema donde una ruta POST no pasa por
 *   `authMiddleware`.
 *
 * Endpoints:
 *   - `POST /` (pública)     — Registra una nueva encuesta (sin token).
 *   - `GET /global`          — Resumen global de encuestas (autenticado).
 *   - `GET /todas`           — Todas las encuestas (autenticado).
 *   - `GET /solicitud/:id`   — Encuestas de una solicitud (autenticado).
 *
 * @module routes/encuesta
 */

import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { registrarEncuesta, obtenerEncuestasPorEvento, obtenerResumenGlobal, obtenerTodasEncuestas } from '../controllers/encuesta.controller.js'

const router = Router()

// Ruta pública — no requiere autenticación (encuestados externos)
router.post('/', registrarEncuesta)

// Rutas protegidas — solo usuarios autenticados
router.use(authMiddleware)
router.get('/global', obtenerResumenGlobal)
router.get('/todas', obtenerTodasEncuestas)
router.get('/solicitud/:solicitudId', obtenerEncuestasPorEvento)

export default router
