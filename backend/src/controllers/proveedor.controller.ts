import type { Request, Response } from 'express'
import * as proveedorService from '../services/proveedor.service.js'

export async function obtenerProveedores(req: Request, res: Response): Promise<void> {
  try {
    const activo = req.query.activo !== undefined ? req.query.activo === 'true' : undefined
    const proveedores = await proveedorService.obtenerProveedores(activo)
    res.json(proveedores)
  } catch (error: any) {
    console.error('Error al obtener proveedores:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export async function obtenerProveedorPorId(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id)
    const proveedor = await proveedorService.obtenerProveedorPorId(id)
    res.json(proveedor)
  } catch (error: any) {
    const statusCode = error.statusCode || 500
    const message = statusCode === 500 ? 'Error interno del servidor' : error.message
    if (statusCode === 500) console.error('Error al obtener proveedor:', error)
    res.status(statusCode).json({ error: message })
  }
}

export async function crearProveedor(req: Request, res: Response): Promise<void> {
  try {
    const { nombre, especialidad, email, telefono } = req.body
    if (!nombre) {
      res.status(400).json({ error: 'El campo nombre es requerido' })
      return
    }
    const proveedor = await proveedorService.crearProveedor({ nombre, especialidad, email, telefono })
    res.status(201).json(proveedor)
  } catch (error: any) {
    console.error('Error al crear proveedor:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export async function editarProveedor(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id)
    const { nombre, especialidad, email, telefono } = req.body
    const proveedor = await proveedorService.editarProveedor(id, { nombre, especialidad, email, telefono })
    res.json(proveedor)
  } catch (error: any) {
    const statusCode = error.statusCode || 500
    const message = statusCode === 500 ? 'Error interno del servidor' : error.message
    if (statusCode === 500) console.error('Error al editar proveedor:', error)
    res.status(statusCode).json({ error: message })
  }
}

export async function desactivarProveedor(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id)
    const proveedor = await proveedorService.desactivarProveedor(id)
    res.json(proveedor)
  } catch (error: any) {
    const statusCode = error.statusCode || 500
    const message = statusCode === 500 ? 'Error interno del servidor' : error.message
    if (statusCode === 500) console.error('Error al desactivar proveedor:', error)
    res.status(statusCode).json({ error: message })
  }
}
