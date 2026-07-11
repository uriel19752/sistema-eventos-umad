/**
 * @file Rutas del módulo de Calendario / Google Calendar.
 *
 * Propósito global:
 *   Expone los eventos del calendario institucional sincronizados con
 *   Google Calendar. Todas las rutas requieren autenticación JWT.
 *
 * Endpoints:
 *   - `GET /eventos` — Obtiene eventos del calendario en un rango de fechas.
 *
 * @module routes/calendario
 */

import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { obtenerEventosCalendario } from '../controllers/calendario.controller.js'

const router = Router()

router.use(authMiddleware)

router.get('/eventos', obtenerEventosCalendario)

export default router
