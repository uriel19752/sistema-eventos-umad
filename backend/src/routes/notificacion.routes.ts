/**
 * @file Rutas del módulo de Notificaciones.
 *
 * Propósito global:
 *   Gestiona las notificaciones internas del sistema (cambios de estado en
 *   solicitudes, asignaciones, etc.). Todas las rutas requieren autenticación
 *   JWT y filtran notificaciones por `req.usuario.id`.
 *
 * Endpoints:
 *   - `GET /`           — Obtiene las notificaciones del usuario autenticado.
 *   - `PATCH /:id/leida`— Marca una notificación como leída.
 *
 * @module routes/notificacion
 */

import { Router } from "express";
import { authMiddleware } from "../middleware/auth.middleware.js";
import {
  obtenerNotificaciones,
  marcarNotificacionLeida,
} from "../controllers/notificacion.controller.js";

const router = Router();

router.use(authMiddleware);

router.get("/", obtenerNotificaciones);
router.patch("/:id/leida", marcarNotificacionLeida);

export default router;
