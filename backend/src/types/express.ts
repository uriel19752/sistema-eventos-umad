import 'express'

/**
 * Extensión del interface `Express.Request` para incluir los datos del
 * usuario autenticado tras la validación del JWT.
 *
 * La propiedad `usuario` es inyectada por `authMiddleware` (véase
 * `middleware/auth.middleware.ts`) durante el flujo de autenticación.
 *
 * Contrato de datos:
 *
 * @property {number} id - Identificador único del usuario en la tabla
 *   `usuarios` de la base de datos. Se usa para filtrar solicitudes
 *   propias, auditoría, y relaciones FK.
 *
 * @property {string} correo - Correo electrónico institucional del
 *   usuario. Se emplea como identificador único del lado de negocio
 *   y como `subject` en el JWT.
 *
 * @property {'ADMIN' | 'SOLICITANTE'} rol - Rol asignado al usuario
 *   para el control de acceso basado en roles (RBAC):
 *   - `'ADMIN'`: Privilegios totales sobre todas las rutas y
 *     operaciones CRUD del sistema.
 *   - `'SOLICITANTE'': Solo puede acceder a sus propias solicitudes
 *     y a los catálogos públicos.
 *
 * @example
 * // Uso típico en un controlador tras authMiddleware
 * function handler(req: Request, res: Response) {
 *   const userId = req.usuario!.id       // número
 *   const userRole = req.usuario!.rol     // 'ADMIN' | 'SOLICITANTE'
 * }
 */
declare module 'express' {
  interface Request {
    usuario?: {
      id: number
      correo: string
      rol: 'ADMIN' | 'SOLICITANTE'
    }
  }
}
