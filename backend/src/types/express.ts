import 'express'

declare module 'express' {
  interface Request {
    usuario?: {
      id: number
      correo: string
      rol: 'ADMIN' | 'USER'
    }
  }
}
