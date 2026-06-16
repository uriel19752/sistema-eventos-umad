import type { Request, Response } from 'express'
import prisma from '../config/db.js'

export async function obtenerCatalogos(_req: Request, res: Response): Promise<void> {
  try {
    const [instituciones, planteles] = await Promise.all([
      prisma.institucion.findMany({ orderBy: { id: 'asc' } }),
      prisma.plantel.findMany({ orderBy: { id: 'asc' } }),
    ])

    res.json({ instituciones, planteles })
  } catch (error) {
    console.error('Error al obtener catálogos:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}
