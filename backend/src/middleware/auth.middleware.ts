import type { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface UsuarioPayload {
  id: number
  correo: string
  rol: 'ADMIN' | 'SOLICITANTE'
}

const SECRET = process.env.JWT_SECRET ?? 'tigretrack-secret-dev'

export function generarToken(payload: UsuarioPayload): string {
  return jwt.sign(payload, SECRET, { expiresIn: '24h' })
}

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
