import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { OAuth2Client } from 'google-auth-library'
import prisma from '../config/db.js'

const SECRET = process.env.JWT_SECRET ?? 'tigretrack-secret-dev'
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

export async function registrarUsuario(nombre: string, email: string, password: string) {
  const existe = await prisma.usuario.findUnique({ where: { email } })
  if (existe) {
    throw Object.assign(new Error('El correo ya está registrado'), { statusCode: 400 })
  }

  const hash = await bcrypt.hash(password, 10)
  const usuario = await prisma.usuario.create({
    data: { nombre, email, password: hash, rol: 'SOLICITANTE' },
  })

  const { password: _, ...usuarioSinPassword } = usuario
  return usuarioSinPassword
}

export async function loginLocal(email: string, password: string) {
  const usuario = await prisma.usuario.findUnique({ where: { email } })

  if (!usuario || !usuario.password) {
    throw Object.assign(new Error('Credenciales inválidas'), { statusCode: 401 })
  }

  const valida = await bcrypt.compare(password, usuario.password)
  if (!valida) {
    throw Object.assign(new Error('Credenciales inválidas'), { statusCode: 401 })
  }

  const token = jwt.sign(
    { id: usuario.id, correo: usuario.email, rol: usuario.rol },
    SECRET,
    { expiresIn: '8h' },
  )

  const { password: _, ...usuarioSinPassword } = usuario
  return { usuario: usuarioSinPassword, token }
}

export async function loginConGoogle(idToken: string) {
  let payload
  try {
    const clientId = process.env.GOOGLE_CLIENT_ID
    if (!clientId) {
      throw Object.assign(new Error('GOOGLE_CLIENT_ID no configurado'), { statusCode: 500 })
    }
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: clientId,
    })
    payload = ticket.getPayload()
  } catch {
    throw Object.assign(new Error('Token de Google inválido'), { statusCode: 401 })
  }

  const sub = payload?.sub
  const email = payload?.email
  const name = payload?.name

  if (!sub || !email || !name) {
    throw Object.assign(new Error('Datos de Google incompletos'), { statusCode: 401 })
  }

  const existente = await prisma.usuario.findFirst({
    where: { OR: [{ googleId: sub }, { email }] },
  })

  let usuario
  if (!existente) {
    usuario = await prisma.usuario.create({
      data: { nombre: name, email, googleId: sub, rol: 'SOLICITANTE' },
    })
  } else {
    if (!existente.googleId) {
      usuario = await prisma.usuario.update({
        where: { id: existente.id },
        data: { googleId: sub },
      })
    } else {
      usuario = existente
    }
  }

  const token = jwt.sign(
    { id: usuario.id, correo: usuario.email, rol: usuario.rol },
    SECRET,
    { expiresIn: '8h' },
  )

  const { password: _, ...usuarioSinPassword } = usuario
  return { usuario: usuarioSinPassword, token }
}
