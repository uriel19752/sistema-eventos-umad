import type { Request, Response } from 'express'
import prisma from '../config/db.js'
import type { Estado } from '../generated/prisma/client.js'
import { enviarAlertaNuevaSolicitud, enviarAlertaCancelacionTardia } from '../services/mailService.js'

const MS_IN_48_HOURS = 48 * 60 * 60 * 1000

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function formatTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export async function crearSolicitud(req: Request, res: Response): Promise<void> {
  console.log("=== DIAGNÓSTICO DE SOLICITUD TIGRETRACK ===");
  console.log("Campos recibidos en req.body:", JSON.stringify(req.body, null, 2));
  try {
    const {
      folio,
      nombreEvento,
      descripcion,
      objetivo,
      publico,
      autoridades,
      plantelId,
      institucionId,
      lugar,
      ubicacion,
      fechaEvento,
      horaInicio,
      horaFin,
      responsableNombre,
      contacto,
      area,
      observaciones,
      prioridad,
    } = req.body


    if (!folio || !nombreEvento || !fechaEvento || !horaInicio || !horaFin || !responsableNombre) {
      const missingFields = [];
      if (!folio) missingFields.push('folio');
      if (!nombreEvento) missingFields.push('nombreEvento');
      if (!fechaEvento) missingFields.push('fechaEvento');
      if (!horaInicio) missingFields.push('horaInicio');
      if (!horaFin) missingFields.push('horaFin');
      if (!responsableNombre) missingFields.push('responsableNombre');

      console.log("VALIDACIÓN FALLIDA: Faltan campos obligatorios:", missingFields);
      res.status(400).json({ 
        error: 'Faltan datos obligatorios', 
        detalle: `Campos faltantes: ${missingFields.join(', ')}` 
      })
      return
    }

    const fechaEventoDate = new Date(fechaEvento)
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    const fechaMinima = new Date(hoy)
    fechaMinima.setDate(fechaMinima.getDate() + 7)

    if (fechaEventoDate < fechaMinima) {
      res.status(400).json({
        error: `La fecha del evento debe ser al menos 7 días posterior a la fecha actual. Fecha mínima: ${fechaMinima.toISOString().split('T')[0]}`,
      })
      return
    }

    const solicitud = await prisma.solicitudEvento.create({
      data: {
        folio,
        nombreEvento,
        descripcion: descripcion || null,
        objetivoCobertura: objetivo || null,
        publicoObjetivo: publico || null,
        autoridadesAsistentes: autoridades || null,
        plantelId: plantelId ? Number(plantelId) : null,
        institucionId: institucionId ? Number(institucionId) : null,
        lugarEspecifico: lugar ? `${lugar}${ubicacion ? ' - ' + ubicacion : ''}` : null,
        fechaEvento: new Date(fechaEvento),
        horarioInicioFin: `${horaInicio} - ${horaFin}`,
        horaInicio: new Date(`1970-01-01T${horaInicio}:00`),
        horaFin: new Date(`1970-01-01T${horaFin}:00`),
        responsableEvento: responsableNombre || null,
        whatsappCorreo: contacto || null,
        areaDepartamento: area || null,
        materialesRequeridos: (() => {
          const lista = []
          if (req.body.materiales?.fotografias) lista.push('Fotografías')
          if (req.body.materiales?.notaWeb) lista.push('Nota Web')
          if (req.body.materiales?.banners) lista.push('Banners')
          if (req.body.materiales?.otro) lista.push(req.body.materiales.otro)
          return lista.join(', ') || null
        })(),
      }
    })

    try {
      enviarAlertaNuevaSolicitud({
        folio: solicitud.folio,
        nombreEvento: solicitud.nombreEvento,
        fechaEvento: formatDate(solicitud.fechaEvento),
        horaInicio: formatTime(solicitud.horaInicio),
        responsableNombre: solicitud.responsableNombre,
      }).catch((e) => console.error('Error al enviar correo:', e))
    } catch (_e) {
      console.error('Error al enviar alerta de nueva solicitud:', _e)
    }

    res.status(201).json(solicitud)
  } catch (error) {
    console.error('Error al crear solicitud:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export async function obtenerSolicitudes(_req: Request, res: Response): Promise<void> {
  try {
    const solicitudes = await prisma.solicitudEvento.findMany({
      select: {
        id: true,
        folio: true,
        nombreEvento: true,
        descripcion: true,
        objetivoCobertura: true,
        publicoObjetivo: true,
        autoridadesAsistentes: true,
        lugarEspecifico: true,
        fechaEvento: true,
        horaInicio: true,
        horaFin: true,
        horarioInicioFin: true,
        responsableNombre: true,
        responsableEvento: true,
        contacto: true,
        whatsappCorreo: true,
        departamentoSolicitante: true,
        areaDepartamento: true,
        materialesRequeridos: true,
        prioridad: true,
        estado: true,
        fechaSolicitud: true,
        plantelId: true,
        institucionId: true,
        plantel: true,
        institucion: true,
      },
      orderBy: { fechaSolicitud: 'desc' },
    })

    res.json(solicitudes)
  } catch (error) {
    console.error('Error al listar solicitudes:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export async function obtenerSolicitudPorId(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id)

    if (!id) {
      res.status(400).json({ error: 'ID inválido' })
      return
    }

    const solicitud = await prisma.solicitudEvento.findUnique({
      where: { id },
      include: {
        plantel: true,
        institucion: true,
        materialSolicitado: true,
      },
    })

    if (!solicitud) {
      res.status(404).json({ error: 'Solicitud no encontrada' })
      return
    }

    res.json(solicitud)
  } catch (error) {
    console.error('Error al obtener solicitud:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export async function actualizarEstado(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id)
    const { estado, motivo } = req.body as { estado: Estado; motivo?: string }

    if (!id || !estado) {
      res.status(400).json({ error: 'Faltan id y estado' })
      return
    }

    const estadosValidos = ['Pendiente', 'Aprobado', 'Completada', 'Cancelada']
    if (!estadosValidos.includes(estado)) {
      res.status(400).json({ error: `Estado inválido. Debe ser: ${estadosValidos.join(', ')}` })
      return
    }

    const solicitudActual = await prisma.solicitudEvento.findUnique({ where: { id } })

    if (!solicitudActual) {
      res.status(404).json({ error: 'Solicitud no encontrada' })
      return
    }

    if (solicitudActual.estado === estado) {
      res.status(400).json({ error: 'La solicitud ya se encuentra en ese estado' })
      return
    }

    if (estado === 'Cancelada') {
      const fechaEventoStr = formatDate(solicitudActual.fechaEvento)
      const horaInicioStr = formatTime(solicitudActual.horaInicio)
      const fechaHoraEvento = new Date(`${fechaEventoStr}T${horaInicioStr}`)
      const tardia = (fechaHoraEvento.getTime() - Date.now()) < MS_IN_48_HOURS

      const resultado = await prisma.$transaction(async (tx) => {
        const actualizada = await tx.solicitudEvento.update({
          where: { id },
          data: { estado },
        })

        await tx.auditoriaCancelacion.create({
          data: {
            solicitudId: id,
            estadoAnterior: solicitudActual.estado,
            motivo: motivo ?? null,
            tardia,
          },
        })

        return actualizada
      })

      if (tardia) {
        enviarAlertaCancelacionTardia({
          folio: solicitudActual.folio,
          nombreEvento: solicitudActual.nombreEvento,
          fechaEvento: formatDate(solicitudActual.fechaEvento),
          horaInicio: formatTime(solicitudActual.horaInicio),
          responsableNombre: solicitudActual.responsableNombre,
          tardia,
        }).catch((e) => console.error('Error al enviar correo de cancelación:', e))
      }

      res.json(resultado)
      return
    }

    const actualizada = await prisma.solicitudEvento.update({
      where: { id },
      data: { estado },
    })

    res.json(actualizada)
  } catch (error) {
    console.error('Error al actualizar estado:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}
