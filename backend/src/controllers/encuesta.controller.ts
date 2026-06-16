import type { Request, Response } from 'express'
import prisma from '../config/db.js'

export async function registrarEncuesta(req: Request, res: Response): Promise<void> {
  try {
    const { solicitud_id, calificacion, comentarios } = req.body

    if (!solicitud_id || calificacion == null) {
      res.status(400).json({ error: 'Faltan solicitud_id y calificacion' })
      return
    }

    const nota = Number(calificacion)
    if (isNaN(nota) || nota < 1 || nota > 5) {
      res.status(400).json({ error: 'La calificación debe ser un número entre 1 y 5' })
      return
    }

    const solicitudIdStr = String(solicitud_id)

    const solicitud = await prisma.solicitudEvento.findFirst({ 
      where: { folio: solicitudIdStr } 
    })
    
    if (!solicitud) {
      res.status(404).json({ error: 'Solicitud de evento no encontrada con el folio proporcionado' })
      return
    }

    const encuesta = await prisma.encuestaSatisfaccion.create({
      data: {
        solicitudId: solicitud.id,
        calificacion: nota,
        comentarios: comentarios ?? null,
      },
    })

    res.status(201).json(encuesta)
  } catch (error) {
    console.error('Error al registrar encuesta en DB:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export async function obtenerEncuestasPorEvento(req: Request, res: Response): Promise<void> {
  try {
    const solicitudId = Number(req.params.solicitudId)

    if (!solicitudId) {
      res.status(400).json({ error: 'solicitudId inválido' })
      return
    }

    const encuestas = await prisma.encuestaSatisfaccion.findMany({
      where: { solicitudId },
      orderBy: { fechaRespuesta: 'desc' },
    })

    const total = encuestas.length
    const promedio = total > 0
      ? encuestas.reduce((sum, e) => sum + e.calificacion, 0) / total
      : 0

    const distribucion: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    for (const e of encuestas) {
      distribucion[e.calificacion] = (distribucion[e.calificacion] ?? 0) + 1
    }

    res.json({ encuestas, promedio: Math.round(promedio * 100) / 100, total, distribucion })
  } catch (error) {
    console.error('Error al obtener encuestas:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export async function obtenerResumenGlobal(_req: Request, res: Response): Promise<void> {
  try {
    const encuestas = await prisma.encuestaSatisfaccion.findMany()

    const total = encuestas.length
    const promedio = total > 0
      ? encuestas.reduce((sum, e) => sum + e.calificacion, 0) / total
      : 0

    res.json({ promedio: Math.round(promedio * 100) / 100, totalEncuestas: total })
  } catch (error) {
    console.error('Error al obtener resumen global:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}
