import type { Request, Response } from 'express'
import prisma from '../config/db.js'
import type { TipoMaterial } from '../generated/prisma/client.js'

const TIPOS_VALIDOS: TipoMaterial[] = ['Fotografia', 'Nota_Web', 'Banner', 'Otro']

export async function agregarMateriales(req: Request, res: Response): Promise<void> {
  try {
    const { solicitud_id, materiales } = req.body

    if (!solicitud_id || !Array.isArray(materiales) || materiales.length === 0) {
      res.status(400).json({ error: 'Se requiere solicitud_id y un arreglo de materiales' })
      return
    }

    const solicitud = await prisma.solicitudEvento.findUnique({ where: { id: Number(solicitud_id) } })
    if (!solicitud) {
      res.status(404).json({ error: 'Solicitud de evento no encontrada' })
      return
    }

    for (const m of materiales) {
      if (!m.tipo_material || !TIPOS_VALIDOS.includes(m.tipo_material)) {
        res.status(400).json({
          error: `tipo_material inválido: "${m.tipo_material}". Valores permitidos: ${TIPOS_VALIDOS.join(', ')}`,
        })
        return
      }
    }

    const data = materiales.map((m: { tipo_material: TipoMaterial; descripcion_otro?: string }) => ({
      solicitudId: Number(solicitud_id),
      tipoMaterial: m.tipo_material,
      descripcionOtro: m.descripcion_otro ?? null,
    }))

    const resultado = await prisma.materialSolicitado.createMany({ data })

    res.status(201).json({ insertados: resultado.count })
  } catch (error) {
    console.error('Error al agregar materiales:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export async function obtenerMaterialesPorSolicitud(req: Request, res: Response): Promise<void> {
  try {
    const solicitudId = Number(req.params.solicitudId)

    if (!solicitudId) {
      res.status(400).json({ error: 'solicitudId inválido' })
      return
    }

    const materiales = await prisma.materialSolicitado.findMany({
      where: { solicitudId },
    })

    res.json(materiales)
  } catch (error) {
    console.error('Error al obtener materiales:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}
