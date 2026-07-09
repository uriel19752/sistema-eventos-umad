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
