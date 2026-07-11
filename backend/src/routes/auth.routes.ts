/**
 * @file Rutas del módulo de Autenticación (sin JWT).
 *
 * Propósito global:
 *   Punto de entrada pública para el registro e inicio de sesión de usuarios.
 *   Estas rutas NO pasan por `authMiddleware` porque el token aún no existe
 *   en este punto del flujo. El login retorna un JWT que el cliente debe
 *   adjuntar como `Authorization: Bearer <token>` en adelante.
 *
 * Endpoints:
 *   - `POST /signup` — Registro local (correo + contraseña).
 *   - `POST /login`  — Inicio de sesión local, retorna JWT + datos del usuario.
 *   - `POST /google` — Inicio de sesión con Google OAuth 2.0 (IdP externo),
 *                      retorna JWT + datos del usuario.
 *
 * @module routes/auth
 */

import { Router } from 'express'
import { signupHandler, loginHandler, googleLoginHandler } from '../controllers/auth.controller.js'

const router = Router()

router.post('/signup', signupHandler)
router.post('/login', loginHandler)
router.post('/google', googleLoginHandler)

export default router
