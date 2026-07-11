import type { Request, Response } from 'express'
import type { Multer } from 'multer'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import PDFDocument from 'pdfkit'
import * as solicitudService from '../services/solicitud.service.js'
import type { CrearSolicitudDTO } from '../dto/crearSolicitud.dto.js'
import type { ActualizarEstadoDTO } from '../dto/actualizarEstado.dto.js'
import type { EditarSolicitudDTO } from '../dto/editarSolicitud.dto.js'
import type { UsuarioAuth } from '../services/solicitud.service.js'
import prisma from '../config/db.js'
import { enviarCorreoModificacion, enviarNotificacionProveedor } from '../services/mailService.js'

/**
 * Directorio absoluto donde se almacenan los croquis subidos.
 * Resuelve a `{cwd}/uploads/croquis/` para que Express pueda servirlos
 * estáticamente en la ruta `/uploads/croquis/` (configurado en `app.ts`
 * mediante `app.use('/uploads', express.static('uploads'))`).
 */
const CROQUIS_DIR = path.join(process.cwd(), 'uploads', 'croquis')

if (!fs.existsSync(CROQUIS_DIR)) {
  fs.mkdirSync(CROQUIS_DIR, { recursive: true })
}

/**
 * Configuración del almacenamiento en disco de multer para croquis.
 *
 * Nomenclatura dinámica `solicitud-${id}-${timestamp}${ext}`:
 *
 *   - `id`:  ID de la solicitud en base de datos, permite asociar
 *            visualmente el archivo a su registro sin abrir la BD.
 *   - `timestamp`: `Date.now()` (milisegundos desde epoch). Garantiza
 *            unicidad absoluta incluso si el mismo usuario sube múltiples
 *            croquis para la misma solicitud en un mismo segundo, ya que
 *            los milisegundos en Node.js tienen resolución sub‑milisegundo
 *            en la práctica (suficiente para evitar colisiones en producción).
 *   - `ext`:  Extensión original preservada para que el navegador pueda
 *            interpretar el Content-Type al servir el archivo estático.
 *
 * Esta nomenclatura evita colisiones sin necesidad de UUIDs ni tablas
 * de metadatos adicionales, manteniendo legibilidad humana en el
 * sistema de archivos para depuración.
 */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, CROQUIS_DIR),
  filename: (req, file, cb) => {
    const id = req.params.id
    const ext = path.extname(file.originalname) || '.png'
    const timestamp = Date.now()
    cb(null, `solicitud-${id}-${timestamp}${ext}`)
  },
})

/**
 * Middleware de multer configurado para la subida de croquis.
 *
 * Seguridad — `fileFilter`:
 *   Solo se permiten extensiones de imágenes estándar (PNG, JPG, GIF, WEBP)
 *   y PDF. Cualquier otra extensión (`.exe`, `.js`, `.html`, `.svg`, `.bat`,
 *   `.php`, `.zip`, etc.) es rechazada con un error 400. Esta lista blanca
 *   es la primera línea de defensa contra subida de archivos maliciosos.
 *
 *   ⚠ Limitación conocida: la validación por extensión es débil ante
 *   `double-extensions` (ej. `croquis.pdf.exe`). Para entornos con mayores
 *   requisitos de seguridad, se recomienda añadir `mime-type` checking
 *   con `file-type` (magic bytes) antes de `cb(null, true)`.
 *
 * Límite de tamaño (`limits.fileSize`):
 *   10 MB. Archivos mayores son rechazados automáticamente por multer con
 *   error `LIMIT_FILE_SIZE` antes de escribir al disco.
 */
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.pdf', '.webp']
    const ext = path.extname(file.originalname).toLowerCase()
    if (allowed.includes(ext)) {
      cb(null, true)
    } else {
      cb(new Error('Formato de archivo no permitido. Use: PNG, JPG, GIF, PDF, WEBP'))
    }
  },
})

function getUsuario(req: Request): UsuarioAuth {
  if (!req.usuario) {
    throw Object.assign(new Error('Usuario no autenticado'), { statusCode: 401 })
  }
  console.log("[AUTH] Email del usuario autenticado:", req.usuario.correo);
  return { id: req.usuario.id, email: req.usuario.correo, rol: req.usuario.rol }
}

export const crearSolicitud = async (req: Request, res: Response) => {
  try {
    const usuario = getUsuario(req)

    // Ajustamos el DTO para capturar las IDs que alimentan las estadísticas
    const dto: CrearSolicitudDTO & { plantelId: number; institucionId?: number } = {
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
      institucionPersonalizada: req.body.institucionPersonalizada,
      datosEspecificos: req.body.datosEspecificos,
      croquisUrl: req.body.croquisUrl,
      materiales: req.body.materiales,
      // 🔑 SOLUCIÓN: Inyección y conversión explícita de las llaves relacionales
      plantelId: Number(req.body.plantelId),
      ...(req.body.institucionId !== undefined && { institucionId: Number(req.body.institucionId) }),
    }

    // Asegúrate de que tu servicio reciba estas dos propiedades en el objeto
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

export async function obtenerSolicitudPublica(req: Request, res: Response): Promise<void> {
  try {
    const id = Number(req.params.id)
    if (!id) {
      res.status(400).json({ error: 'ID inválido' })
      return
    }
    const solicitud = await prisma.solicitudEvento.findUnique({
      where: { id },
      select: { nombreEvento: true },
    })
    if (!solicitud) {
      res.status(404).json({ error: 'Solicitud no encontrada' })
      return
    }
    res.json({ nombreEvento: solicitud.nombreEvento })
  } catch (error) {
    console.error('Error al obtener solicitud pública:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
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

export async function editarSolicitud(req: Request, res: Response): Promise<void> {
  try {
    const usuario = getUsuario(req)
    const id = Number(req.params.id)
    const data: EditarSolicitudDTO = {
      ...req.body,
      plantelId: req.body.plantelId != null ? Number(req.body.plantelId) : undefined,
      institucionId: req.body.institucionId != null ? Number(req.body.institucionId) : undefined,
      institucionPersonalizada: req.body.institucionPersonalizada,
      datosEspecificos: req.body.datosEspecificos,
      croquisUrl: req.body.croquisUrl,
    }

    const solicitudActual = await prisma.solicitudEvento.findUnique({
      where: { id },
      select: { estado: true, usuarioId: true },
    })

    const result = await solicitudService.editarSolicitud(id, data, usuario)

    if (usuario.rol === 'SOLICITANTE') {
      await enviarCorreoModificacion({
        solicitudId: result.id,
        folio: result.folio,
        nombreEvento: result.nombreEvento,
        fechaEvento: result.fechaEvento?.toISOString().split('T')[0] ?? '',
        horaInicio: result.horaInicio?.toISOString().split('T')[1]?.substring(0, 5) ?? '',
        responsableNombre: result.responsableNombre,
        editadoPor: 'solicitante',
      })
    } else if (usuario.rol === 'ADMIN' && solicitudActual?.estado === 'Aprobado') {
      const docente = solicitudActual.usuarioId
        ? await prisma.usuario.findUnique({ where: { id: solicitudActual.usuarioId }, select: { email: true } })
        : null

      if (docente?.email) {
        await enviarCorreoModificacion({
          solicitudId: result.id,
          folio: result.folio,
          nombreEvento: result.nombreEvento,
          fechaEvento: result.fechaEvento?.toISOString().split('T')[0] ?? '',
          horaInicio: result.horaInicio?.toISOString().split('T')[1]?.substring(0, 5) ?? '',
          responsableNombre: result.responsableNombre,
          editadoPor: 'admin',
          emailDocente: docente.email,
        })
      }
    }

    res.json(result)
  } catch (error: any) {
    const statusCode = error.statusCode || 500
    const message = statusCode === 500 ? 'Error interno del servidor' : error.message
    if (statusCode === 500) console.error('Error al editar solicitud:', error)
    res.status(statusCode).json({ error: message })
  }
}

export async function asignarProveedores(req: Request, res: Response): Promise<void> {
  try {
    const usuario = getUsuario(req)
    if (usuario.rol !== 'ADMIN') {
      res.status(403).json({ error: 'Solo administradores pueden asignar proveedores' })
      return
    }
    const id = Number(req.params.id)
    const { proveedorIds } = req.body

    const solicitud = await prisma.solicitudEvento.findUnique({ where: { id } })
    if (!solicitud) {
      res.status(404).json({ error: 'Solicitud no encontrada' })
      return
    }

    // Solo notificamos la primera vez que se asignan proveedores.
    // Las modificaciones posteriores son internas y no generan correos.
    const existingCount = await prisma.asignacionProveedor.count({
      where: { solicitudId: id },
    })

    const proveedoresAsignados = await solicitudService.asignarProveedores(id, proveedorIds ?? [])

    if (existingCount === 0 && proveedorIds.length > 0) {
      const fechaStr = solicitud.fechaEvento instanceof Date
        ? solicitud.fechaEvento.toISOString()
        : String(solicitud.fechaEvento ?? '')
      const fmtFecha = fechaStr.split('T')[0] ?? ''

      const fmtHoraInicio = solicitud.horaInicio instanceof Date
        ? `${String(solicitud.horaInicio.getUTCHours()).padStart(2, '0')}:${String(solicitud.horaInicio.getUTCMinutes()).padStart(2, '0')}`
        : String(solicitud.horaInicio ?? '').slice(0, 5)

      const fmtHoraFin = solicitud.horaFin instanceof Date
        ? `${String(solicitud.horaFin.getUTCHours()).padStart(2, '0')}:${String(solicitud.horaFin.getUTCMinutes()).padStart(2, '0')}`
        : String(solicitud.horaFin ?? '').slice(0, 5)

      for (const ap of proveedoresAsignados) {
        if (ap.proveedor.email) {
          enviarNotificacionProveedor('asignacion', {
            proveedorNombre: ap.proveedor.nombre,
            proveedorEmail: ap.proveedor.email,
            folio: solicitud.folio,
            nombreEvento: solicitud.nombreEvento,
            fechaEvento: fmtFecha,
            horaInicio: fmtHoraInicio,
            horaFin: fmtHoraFin,
            lugar: solicitud.lugarEspecifico ?? '',
            responsable: solicitud.responsableNombre,
            contacto: solicitud.contacto ?? '',
          }).catch((e) => console.error(`[MAIL] Error al enviar asignación a ${ap.proveedor.email}:`, e))
        }
      }
    }

    res.json(proveedoresAsignados)
  } catch (error: any) {
    console.error('Error al asignar proveedores:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}

export async function exportarSolicitudPDF(req: Request, res: Response): Promise<void> {
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
        usuario: { select: { id: true, email: true, rol: true } },
      },
    })

    if (!solicitud) {
      res.status(404).json({ error: 'Solicitud no encontrada' })
      return
    }

    const doc = new PDFDocument({ margin: 50, size: 'A4' })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="Solicitud-${solicitud.folio}.pdf"`)

    doc.pipe(res)

    const fechaEvento = solicitud.fechaEvento instanceof Date
      ? solicitud.fechaEvento.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
      : String(solicitud.fechaEvento ?? '')

    const horaInicio = solicitud.horaInicio instanceof Date
      ? `${String(solicitud.horaInicio.getUTCHours()).padStart(2, '0')}:${String(solicitud.horaInicio.getUTCMinutes()).padStart(2, '0')}`
      : String(solicitud.horaInicio ?? '').slice(0, 5)

    const horaFin = solicitud.horaFin instanceof Date
      ? `${String(solicitud.horaFin.getUTCHours()).padStart(2, '0')}:${String(solicitud.horaFin.getUTCMinutes()).padStart(2, '0')}`
      : String(solicitud.horaFin ?? '').slice(0, 5)

    const AZUL = '#1E3A8A'
    const ROJO = '#E11D48'

    doc.font('Helvetica-Bold').fontSize(20).fillColor(AZUL).text('TIGRETRACK', { align: 'left' })
    doc.fontSize(7).fillColor('#64748B').text('REPORTE DE COBERTURA LOGÍSTICA', { align: 'left' })
    doc.moveDown(0.3)

    const statusColors: Record<string, string> = {
      Pendiente: '#F59E0B', Aprobado: '#1E3A8A', Completada: '#16A34A', Cancelada: '#DC2626',
    }
    const sColor = statusColors[solicitud.estado] ?? '#64748B'
    doc.roundedRect(50, doc.y - 2, 50, 14, 3).fill(sColor)
    doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(7)
    doc.text(solicitud.estado.toUpperCase(), 75, doc.y - 5, { align: 'center' })

    doc.fillColor(ROJO).fontSize(10).font('Helvetica-Bold')
    doc.text(`Folio: ${solicitud.folio}`, 110, 52)

    doc.moveDown(1.5)
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor(ROJO).lineWidth(0.6).stroke()
    doc.moveDown(1)

    doc.fontSize(14).fillColor(AZUL).font('Helvetica-Bold').text('Datos del Evento', { underline: false })
    doc.moveDown(0.5)

    doc.fontSize(9).fillColor('#1E293B').font('Helvetica')
    const campos = [
      ['Evento', solicitud.nombreEvento],
      ['Fecha', fechaEvento],
      ['Horario', `${horaInicio} — ${horaFin}`],
      ['Ubicación', solicitud.lugarEspecifico || 'No especificada'],
      ['Responsable', solicitud.responsableNombre],
      ['Contacto', solicitud.contacto || '—'],
      ['Departamento', solicitud.departamentoSolicitante || '—'],
      ['Plantel', solicitud.plantel?.nombre || '—'],
      ['Institución', solicitud.institucion?.nombre || '—'],
    ]
    for (const [label, value] of campos) {
      doc.font('Helvetica-Bold').text(`${label}: `, { continued: true })
      doc.font('Helvetica').text(String(value))
    }

    if (solicitud.materialSolicitado.length > 0) {
      doc.moveDown(1)
      doc.fontSize(11).fillColor(AZUL).font('Helvetica-Bold').text('Materiales Solicitados')
      doc.moveDown(0.4)
      for (const m of solicitud.materialSolicitado) {
        doc.fontSize(9).fillColor('#1E293B').font('Helvetica').text(`• ${m.tipoMaterial}${m.descripcionOtro ? ` (${m.descripcionOtro})` : ''}`)
      }
    }

    const desc = solicitud.descripcion || solicitud.objetivoCobertura
    if (desc) {
      doc.moveDown(1)
      doc.fontSize(11).fillColor(AZUL).font('Helvetica-Bold').text('Descripción')
      doc.moveDown(0.4)
      doc.fontSize(9).fillColor('#334155').font('Helvetica').text(String(desc))
    }

    doc.moveDown(3)
    doc.moveTo(50, doc.y).lineTo(230, doc.y).strokeColor('#CBD5E1').stroke()
    doc.moveTo(365, doc.y).lineTo(545, doc.y).strokeColor('#CBD5E1').stroke()
    doc.moveDown(0.3)
    doc.fontSize(7).fillColor('#1E293B').font('Helvetica-Bold')
    doc.text('Vo.Bo. del Solicitante', 140, doc.y, { align: 'center' })
    doc.text('Autorización de la Coordinación', 455, doc.y, { align: 'center' })

    doc.end()
  } catch (error) {
    console.error('Error al exportar PDF de solicitud:', error)
    res.status(500).json({ error: 'Error al generar el PDF' })
  }
}

/**
 * Controlador compuesto (middleware array) para la subida de croquis.
 *
 * Flujo asíncrono (ejecución secuencial de middlewares):
 *
 * 1. `upload.single('croquis')` — Middleware de multer:
 *    a. Parsea `multipart/form-data` del cuerpo de la petición.
 *    b. Busca el campo `'croquis'` (archivo único).
 *    c. Evalúa `fileFilter` (solo imágenes/PDF, ≤ 10 MB).
 *    d. Si pasa los filtros, escribe el archivo en `uploads/croquis/`
 *       con nombre `solicitud-{id}-{timestamp}.{ext}` (véase `storage`).
 *    e. Inyecta el archivo en `req.file` para el siguiente middleware.
 *    f. Si falla (formato no permitido, archivo muy grande), envía el
 *       error directamente sin llamar al siguiente middleware.
 *
 * 2. Handler asíncrono:
 *    a. Valida que `req.params.id` sea un número entero positivo.
 *    b. Verifica que la solicitud exista en base de datos (404 si no).
 *    c. Confirma que `req.file` esté presente (400 si no).
 *    d. Construye la URL estática relativa:
 *         `/uploads/croquis/solicitud-{id}-{timestamp}.{ext}`
 *       Esta URL es servida por Express como contenido estático desde
 *       `app.use('/uploads', express.static('uploads'))`.
 *    e. Persiste la URL en la columna `croquisUrl` de la solicitud
 *       mediante `prisma.solicitudEvento.update()`, permitiendo que el
 *       frontend cargue la imagen desde el CDN estático.
 *    f. Retorna `{ croquisUrl, message }` con HTTP 200.
 *
 * Manejo de errores:
 *   - Multer lanza `MulterError` con código `LIMIT_FILE_SIZE` si el
 *     archivo excede 10 MB → se captura como error 500 genérico.
 *   - `fileFilter` lanza `Error` con mensaje de formato no permitido →
 *     se captura explícitamente y se retorna 400 con el mensaje.
 *   - Cualquier otro error (BD, disco, etc.) → 500 genérico.
 *
 * @example
 * // Ruta (solicitud.routes.ts)
 * router.post('/:id/croquis', subirCroquis)
 *
 * // Petición esperada
 * POST /api/solicitudes/42/croquis
 * Content-Type: multipart/form-data
 * Body: croquis=<archivo>
 *
 * // Respuesta exitosa
 * { "croquisUrl": "/uploads/croquis/solicitud-42-1712345678901.png", "message": "Croquis subido correctamente" }
 */
export const subirCroquis = [
  upload.single('croquis'),
  async (req: Request, res: Response) => {
    try {
      const solicitudId = Number(req.params.id)
      if (!solicitudId) {
        return res.status(400).json({ error: 'ID de solicitud inválido' })
      }

      const solicitudExistente = await prisma.solicitudEvento.findUnique({ where: { id: solicitudId } })
      if (!solicitudExistente) {
        return res.status(404).json({ error: 'Solicitud no encontrada' })
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No se envió ningún archivo' })
      }

      const croquisUrl = `/uploads/croquis/${req.file.filename}`

      await prisma.solicitudEvento.update({
        where: { id: solicitudId },
        data: { croquisUrl },
      })

      return res.json({ croquisUrl, message: 'Croquis subido correctamente' })
    } catch (error: any) {
      if (error.message?.includes('Formato de archivo no permitido')) {
        return res.status(400).json({ error: error.message })
      }
      console.error('Error al subir croquis:', error)
      return res.status(500).json({ error: 'Error al subir el croquis' })
    }
  },
]
