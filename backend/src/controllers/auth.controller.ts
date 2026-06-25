import type { Request, Response } from 'express'
import bcrypt from 'bcrypt'
import prisma from '../config/db.js'
import { generarToken } from '../middleware/auth.middleware.js'

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { correo, password } = req.body

    if (!correo || !password) {
      res.status(400).json({ error: 'Correo y contraseña requeridos' })
      return
    }

    const usuario = await prisma.usuario.findUnique({ where: { correo } })

    if (!usuario) {
      res.status(401).json({ error: 'Credenciales inválidas' })
      return
    }

    const valida = await bcrypt.compare(password, usuario.password)

    if (!valida) {
      res.status(401).json({ error: 'Credenciales inválidas' })
      return
    }

    const token = generarToken({ id: usuario.id, correo: usuario.correo, rol: usuario.rol })

    res.json({ id: usuario.id, correo: usuario.correo, rol: usuario.rol, token })
  } catch (error) {
    console.error('Error en login:', error)
    res.status(500).json({ error: 'Error interno del servidor' })
  }
}
