import { COLORS } from '../theme/colors'

const STATUS_MAP: Record<string, { color: string; background: string }> = {
  Pendiente: {
    color: '#92400e',
    background: '#fef3c7',
  },
  Aprobado: {
    color: '#1e40af',
    background: '#dbeafe',
  },
  Completada: {
    color: '#166534',
    background: '#dcfce7',
  },
  Cancelada: {
    color: '#991b1b',
    background: '#fee2e2',
  },
}

export function getStatusColor(status: string): string {
  if (status === 'Pendiente') return COLORS.pending
  if (status === 'Aprobado') return COLORS.approved
  if (status === 'Completada') return COLORS.completed
  if (status === 'Cancelada') return COLORS.cancelled
  return COLORS.textPrimary
}

export function getStatusBackground(status: string): string {
  return STATUS_MAP[status]?.background ?? '#f1f5f9'
}
