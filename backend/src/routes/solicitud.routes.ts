/**
 * @file Rutas del módulo de Solicitudes de Cobertura.
 *
 * Propósito global:
 *   Define la red de distribución declarativa de endpoints para la entidad
 *   central del sistema: las solicitudes de cobertura de eventos. Cada ruta
 *   encadena un flujo secuencial de middlewares que aplican, en orden:
 *   autenticación JWT → autorización RBAC (implícita en los controladores)
 *   → validación de datos → lógica de negocio → respuesta.
 *
 * Estructura de capas:
 *   - Una ruta pública (`/publico/:id`) para consulta sin token — necesaria
 *     para que el frontend público pueda mostrar detalles de una solicitud.
 *   - Un bloque completo protegido por `router.use(authMiddleware)` que
 *     asegura **todas** las rutas declaradas debajo. Esto evita olvidar
 *     el middleware en cada endpoint individual.
 *   - Cada controlador implementa su propia verificación de roles (ADMIN /
 *     SOLICITANTE) accediendo a `req.usuario.rol` (véase auth.middleware.ts).
 *
 * @module routes/solicitud
 */

import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.middleware.js'
import { obtenerSolicitudes, obtenerSolicitudPorId, crearSolicitud, actualizarEstado, editarSolicitud, obtenerSolicitudPublica, asignarProveedores, exportarSolicitudPDF, subirCroquis } from '../controllers/solicitud.controller.js'

const router = Router()

// ────────────────────────────────────────────────────────────────────────────
//  Ruta pública — sin autenticación
// ────────────────────────────────────────────────────────────────────────────

/**
 * GET /publico/:id
 *
 * Obtiene los datos públicos de una solicitud (croquis, materiales, fechas)
 * sin requerir token de acceso. Se usa en la página de registro de encuesta
 * de satisfacción y en el visor público de eventos.
 *
 * @access Público
 */
router.get('/publico/:id', obtenerSolicitudPublica)

// ────────────────────────────────────────────────────────────────────────────
//  Middleware de autenticación global (se aplica a todas las rutas siguientes)
// ────────────────────────────────────────────────────────────────────────────
/**
 * Middleware de autenticación JWT — se aplica a TODAS las rutas declaradas
 * a partir de este punto. Verifica el header `Authorization: Bearer <token>`,
 * decodifica el payload y lo inyecta en `req.usuario`.
 *
 * Si el token falta o es inválido, responde 401 y corta la cadena sin
 * ejecutar ningún controlador posterior.
 */
router.use(authMiddleware)

// ────────────────────────────────────────────────────────────────────────────
//  Rutas protegidas
// ────────────────────────────────────────────────────────────────────────────

/**
 * GET /
 *
 * Lista paginada/filtrada de solicitudes. Soporta filtros por estado, fecha,
 * plantel, institución y texto libre. Para usuarios SOLICITANTE solo retorna
 * sus propias solicitudes; ADMIN ve todas.
 *
 * @access Autenticado (protegido por authMiddleware)
 * @authz  Filtro por rol aplicado en `solicitud.service.listarSolicitudes`
 */
router.get('/', obtenerSolicitudes)

/**
 * GET /:id
 *
 * Obtiene una solicitud por su ID con todas las relaciones (materiales,
 * plantel, institución, usuarios, proveedores). SOLICITANTE solo accede
 * a solicitudes propias; ADMIN a cualquiera.
 *
 * @access Autenticado
 * @authz  Barrera de propiedad en `solicitud.service.obtenerSolicitudPorId`
 */
router.get('/:id', obtenerSolicitudPorId)

/**
 * GET /:id/pdf
 *
 * Genera y descarga un archivo PDF con los datos completos de la solicitud.
 * Usa PDFKit para construir el documento en memoria.
 *
 * @access Autenticado
 */
router.get('/:id/pdf', exportarSolicitudPDF)

/**
 * POST /
 *
 * Crea una nueva solicitud de cobertura. El cuerpo debe incluir los campos
 * definidos en `CrearSolicitudDTO`. El controlador asigna automáticamente
 * el `usuarioId` desde `req.usuario.id`.
 *
 * @access Autenticado
 */
router.post('/', crearSolicitud)

/**
 * PUT /:id
 *
 * Edita una solicitud existente. Solo el creador (SOLICITANTE) o ADMIN
 * pueden modificar. Las solicitudes en estado Aprobado tienen restricciones
 * adicionales sobre qué campos se pueden editar.
 *
 * @access Autenticado
 * @authz  Verificación de propiedad/rol en `solicitud.service.editarSolicitud`
 */
router.put('/:id', editarSolicitud)

/**
 * PATCH /:id/estado
 *
 * Cambia el estado de una solicitud (Pendiente → Aprobado → Completada
 * o → Cancelada). Al aprobar, se disparan efectos secundarios:
 * creación del evento en Google Calendar y envío de correo de aprobación.
 *
 * @access Autenticado (solo ADMIN puede cambiar a Aprobado/Completada)
 * @authz  `solicitud.service.actualizarEstado` verifica que el rol tenga
 *         permiso para la transición de estado solicitada.
 */
router.patch('/:id/estado', actualizarEstado)

/**
 * POST /:id/asignar-proveedores
 *
 * Asigna una lista de proveedores externos a la solicitud (servicios de
 * audio, video, iluminación, etc.). Reemplaza cualquier asignación previa.
 *
 * @access Autenticado (solo ADMIN)
 * @authz  Verificación de rol ADMIN en el controlador.
 */
router.post('/:id/asignar-proveedores', asignarProveedores)

/**
 * POST /:id/croquis
 *
 * Sube un archivo de croquis (plano/diagrama del evento) asociado a la
 * solicitud. Flujo de middlewares en orden secuencial:
 *
 *   1. `authMiddleware` — valida el JWT y extrae `req.usuario`.
 *   2. `upload.single('croquis')` — multer procesa `multipart/form-data`,
 *      valida extensión (solo imágenes/PDF), y escribe el archivo a
 *      `uploads/croquis/`.
 *   3. Handler final — actualiza `croquisUrl` en la BD y retorna la URL.
 *
 * @access Autenticado
 * @authz  Propietario o ADMIN (validado internamente por el controlador
 *         mediante la existencia de la solicitud).
 */
router.post('/:id/croquis', subirCroquis)

export default router
