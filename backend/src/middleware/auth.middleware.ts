import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

/**
 * Payload del JWT tras la deserialización.
 *
 * Contrato de datos:
 * - `id`: ID numérico del usuario en la base de datos.
 * - `correo`: Correo electrónico institucional del usuario.
 * - `rol`: Rol del usuario para el control de acceso basado en roles (RBAC).
 *   Los valores posibles son:
 *     - `'ADMIN'`: Acceso completo a todas las rutas y operaciones.
 *     - `'SOLICITANTE'`: Solo puede ver/editar sus propias solicitudes.
 */
export interface UsuarioPayload {
  id: number
  correo: string
  rol: 'ADMIN' | 'SOLICITANTE'
}

const SECRET = process.env.JWT_SECRET ?? 'tigretrack-secret-dev'

/**
 * Genera un JWT firmado con el payload del usuario autenticado.
 *
 * Flujo criptográfico:
 * 1. Toma el payload (id, correo, rol) y lo serializa a JSON.
 * 2. Firma el JSON con HMAC-SHA256 usando `JWT_SECRET` del entorno
 *    (o el fallback `'tigretrack-secret-dev'` para desarrollo local).
 * 3. Asigna una expiración de 24 horas (`expiresIn: '24h'`), tras la cual
 *    cualquier intento de `jwt.verify()` lanzará `TokenExpiredError`.
 *
 * @param payload - Datos identificadores del usuario según el contrato
 *   `UsuarioPayload` (id, correo, rol).
 *
 * @returns {string} JWT compacto (Header.Payload.Signature) listo para
 *   incluir en el header `Authorization: Bearer <token>`.
 *
 * @throws {Error} Si `jwt.sign` falla por una clave secreta inválida o
 *   un payload con propiedades no serializables (poco probable en runtime).
 */
export function generarToken(payload: UsuarioPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: '24h' })
}

/**
 * Middleware de autenticación que valida el JWT de cada solicitud entrante.
 *
 * Flujo secuencial de validación:
 * 1. Extrae el header `Authorization` de la petición.
 * 2. Verifica que el header comience con `'Bearer '` — de lo contrario
 *    responde con HTTP **401** `{ error: 'Token de acceso requerido' }`
 *    y corta la cadena de middlewares (no llama a `next()`).
 * 3. Aplica `header.slice(7)` para eliminar el prefijo `'Bearer '` y
 *    obtener únicamente el string del JWT.
 * 4. Ejecuta `jwt.verify(token, SECRET)` que internamente:
 *    a. Decodifica el base64url del Header y Payload.
 *    b. Recalcula la firma HMAC-SHA256 con `SECRET` y la compara
 *       con la firma recibida. Si no coinciden → lanza `JsonWebTokenError`.
 *    c. Verifica el campo `exp` contra la hora actual del servidor.
 *       Si `exp` < `Date.now() / 1000` → lanza `TokenExpiredError`.
 * 5. Si la verificación es exitosa, asigna el payload decodificado a
 *    `req.usuario` (extensión del interface `Request`) y llama a `next()`
 *    para continuar al siguiente middleware o controlador.
 * 6. Si ocurre cualquier error de verificación (token inválido, expirado,
 *    malformado), responde con HTTP **401** `{ error: 'Token inválido o
 *    expirado' }` y corta la cadena.
 *
 * Manejo de errores criptográficos:
 * - `TokenExpiredError` (hereda de `JsonWebTokenError`): el token superó
 *   las 24h de vida. Se atrapa genéricamente en el `catch` y se responde
 *   401.
 * - `JsonWebTokenError`: firma inválida, algoritmo incorrecto, payload
 *   malformado — misma respuesta 401.
 * - `NotBeforeError`: el token aún no es válido (`nbf` en futuro) — mismo
 *   catch, misma respuesta 401.
 *
 * @param req  - Objeto de petición Express. Se modifica inyectando la
 *   propiedad `usuario` con los datos decodificados del token.
 * @param res  - Objeto de respuesta Express. Se usa únicamente para
 *   enviar errores 401.
 * @param next - Función callback que pasa el control al siguiente middleware
 *   o controlador si la autenticación es exitosa.
 *
 * @returns {void} No retorna valor. Llama a `next()` en éxito o envía
 *   respuesta JSON con error 401 en fallo.
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization

  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token de acceso requerido' })
    return
  }

  const token = header.slice(7)

  try {
    const decoded = jwt.verify(token, SECRET) as UsuarioPayload
    req.usuario = decoded
    next()
  } catch {
    res.status(401).json({ error: 'Token inválido o expirado' })
  }
}

/**
 * Fábrica de middlewares de autorización basada en roles (RBAC).
 *
 * Flujo de control:
 * 1. Se invoca con un arreglo de roles permitidos (ej. `['ADMIN']`).
 * 2. Retorna una función middleware que intercepta cada petición.
 * 3. El middleware verifica que `req.usuario` exista (el token fue
 *    validado previamente por `authMiddleware`).
 * 4. Si `req.usuario.rol` está incluido en `rolesPermitidos`, llama a
 *    `next()` y permite el acceso.
 * 5. Si el rol no está permitido, responde con HTTP **403**
 *    `{ error: 'Acceso denegado: rol sin permisos' }` y corta la cadena.
 *
 * Separación de responsabilidades:
 * - `authMiddleware` se encarga de **quién** es el usuario (autenticación
 *   vía JWT).
 * - `autorizarRoles` se encarga de **qué** puede hacer (autorización vía
 *   roles). Ambas deben encadenarse en este orden para que `req.usuario`
 *   esté disponible cuando `autorizarRoles` lo evalúe.
 *
 * @param rolesPermitidos - Lista de roles con acceso autorizado a la ruta.
 *   Ejemplo: `autorizarRoles('ADMIN')` o `autorizarRoles('ADMIN', 'SOLICITANTE')`.
 *
 * @returns Middleware Express que valida el rol y rechaza con 403 si no
 *   tiene permisos.
 *
 * @example
 * // Proteger ruta solo para administradores
 * router.delete('/usuarios/:id', authMiddleware, autorizarRoles('ADMIN'), handler)
 *
 * @throws {Error} Si `req.usuario` es `undefined` (no se ejecutó
 *   `authMiddleware` antes). El middleware no captura este error,
 *   por lo que Express lo propagará al manejador de errores global.
 */
export function autorizarRoles(...rolesPermitidos: Array<'ADMIN' | 'SOLICITANTE'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.usuario) {
      res.status(401).json({ error: 'Token de acceso requerido' })
      return
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      res.status(403).json({ error: 'Acceso denegado: rol sin permisos' })
      return
    }

    next()
  }
}
