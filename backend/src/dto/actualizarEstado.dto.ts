import type { Estado } from '../generated/prisma/client.js'

export interface ActualizarEstadoDTO {
  estado: Estado
  motivo?: string
  forzar?: boolean
}
