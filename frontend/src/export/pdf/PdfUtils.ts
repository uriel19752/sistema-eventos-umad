export function formatDate(
  date: Date | string,
  locale: string = 'es-MX',
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatShortDate(
  date: Date | string,
  locale: string = 'es-MX',
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  })
}

export function formatDateTime(
  date: Date | string,
  locale: string = 'es-MX',
): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatTime(date: Date | string, locale: string = 'es-MX'): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return [0, 0, 0]
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
}

export function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str
  return str.slice(0, maxLen - 3) + '...'
}

export function normalizeString(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export const STATUS_COLORS: Record<string, string> = {
  Pendiente: '#F59E0B',
  Aprobado: '#1E3A8A',
  Aprobada: '#1E3A8A',
  Completada: '#16A34A',
  Completado: '#16A34A',
  Cancelada: '#E11D48',
  Cancelado: '#E11D48',
  Rechazada: '#DC2626',
  Rechazado: '#DC2626',
}

export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] ?? '#64748B'
}

export function getStatusRgb(status: string): [number, number, number] {
  return hexToRgb(getStatusColor(status))
}
