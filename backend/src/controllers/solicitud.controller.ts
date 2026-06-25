import type { Request, Response } from 'express'
import * as solicitudService from '../services/solicitud.service.js'
import type { CrearSolicitudDTO } from '../dto/crearSolicitud.dto.js'
import type { ActualizarEstadoDTO } from '../dto/actualizarEstado.dto.js'
import type { UsuarioAuth } from '../services/solicitud.service.js'

function getUsuario(req: Request): UsuarioAuth {
  if (!req.usuario) {
    throw Object.assign(new Error('Usuario no autenticado'), { statusCode: 401 })
  }
  return { id: req.usuario.id, rol: req.usuario.rol }
}

export const crearSolicitud = async (req: any, res: any) => {
  try {
    const usuario = getUsuario(req)

    const dto: CrearSolicitudDTO = {
      folio: req.body.folio,
      nombreEvento: req.body.nombreEvento,
      descripcion: req.body.descripcion,
      objetivo: req.body.objetivo,
      publico: req.body.publico,
      autoridades: req.body.autoridades,
      lugarSeleccionado: req.body.lugarSeleccionado,
      lugar: req.body.lugar,
      ubicacion: req.body.ubicacion,
      fechaEvento: req.body.fechaEvento,
      horaInicio: req.body.horaInicio,
      horaFin: req.body.horaFin,
      horaMontaje: req.body.horaMontaje,
      responsableNombre: req.body.responsableNombre,
      contacto: req.body.contacto,
      area: req.body.area,
      observaciones: req.body.observaciones,
      materiales: req.body.materiales,
    }

    const solicitud = await solicitudService.crearSolicitud(dto, usuario)

    return res.status(201).json({
      id: solicitud.id,
      folio: solicitud.folio,
      nombreEvento: solicitud.nombreEvento,
      success: true,
      message: 'Solicitud creada con éxito en la base de datos',
    })
  } catch (error: any) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({ error: error.message })
    }
    console.error('Error al crear solicitud:', error)
    return res.status(500).json({ error: 'Error interno al procesar el registro del evento' })
  }
}

export async function obtenerSolicitudes(req: Request, res: Response): Promise<void> {
  try {
    const usuario = getUsuario(req)
    const solicitudes = await solicitudService.obtenerSolicitudes(usuario)
    res.status(200).json(solicitudes)
  } catch (error: any) {
    const statusCode = error.statusCode || 500
    const message = statusCode === 500 ? 'Error interno al obtener el listado de solicitudes' : error.message
    if (statusCode === 500) console.error('Error al listar solicitudes:', error)
    res.status(statusCode).json({ error: message })
  }
}

export async function obtenerSolicitudPorId(req: Request, res: Response): Promise<void> {
  try {
    const usuario = getUsuario(req)
    const id = Number(req.params.id)
    const solicitud = await solicitudService.obtenerSolicitudPorId(id, usuario)
    res.json(solicitud)
  } catch (error: any) {
    const statusCode = error.statusCode || 500
    const message = statusCode === 500 ? 'Error interno del servidor' : error.message
    if (statusCode === 500) console.error('Error al obtener solicitud:', error)
    res.status(statusCode).json({ error: message })
  }
}

export async function actualizarEstado(req: Request, res: Response): Promise<void> {
  try {
    const usuario = getUsuario(req)
    const id = Number(req.params.id)
    const resultado = await solicitudService.actualizarEstado(id, req.body as ActualizarEstadoDTO, usuario)
    res.json(resultado)
  } catch (error: any) {
    if (error.warning && error.statusCode === 409) {
      res.status(409).json({
        warning: true,
        message: error.message,
        conflictos: error.conflictos,
      })
      return
    }
    const statusCode = error.statusCode || 500
    const message = statusCode === 500 ? 'Error interno del servidor' : error.message
    if (statusCode === 500) console.error('Error al actualizar estado:', error)
    res.status(statusCode).json({ error: message })
  }
}
