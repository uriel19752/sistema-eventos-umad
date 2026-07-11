/**
 * @file Rutas del módulo de Proveedores Externos.
 *
 * Propósito global:
 *   CRUD completo del catálogo de proveedores que pueden ser asignados a
 *   solicitudes de cobertura. Todas las rutas requieren autenticación JWT
 *   y las operaciones de escritura validan rol ADMIN implícitamente en los
 *   controladores.
 *
 * Endpoints:
 *   - `GET /`       — Lista todos los proveedores activos.
 *   - `GET /:id`    — Obtiene un proveedor por ID.
 *   - `POST /`      — Crea un nuevo proveedor (sensible a duplicados).
 *   - `PUT /:id`    — Edita los datos de un proveedor.
 *   - `DELETE /:id` — Desactiva un proveedor (borrado lógico).
 *
 * @module routes/proveedor
 */

import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware.js'
import {
  obtenerProveedores,
  obtenerProveedorPorId,
  crearProveedor,
  editarProveedor,
  desactivarProveedor,
} from '../controllers/proveedor.controller.js'

const router = Router()

router.use(authMiddleware)

router.get('/', obtenerProveedores)
router.get('/:id', obtenerProveedorPorId)
router.post('/', crearProveedor)
router.put('/:id', editarProveedor)
router.delete('/:id', desactivarProveedor)

export default router
