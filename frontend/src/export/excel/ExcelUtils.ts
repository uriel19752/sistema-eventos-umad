import type { Cell, Row, Column } from 'exceljs'
import {
  EXCEL_FONTS,
  EXCEL_HEADER_FILL,
  EXCEL_BORDERS,
  EXCEL_ALIGNMENT,
  EXCEL_DEFAULTS,
  type ExcelColumnStyle,
} from './ExcelTheme'

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatShortDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function applyCellStyle(cell: Cell, style: ExcelColumnStyle): void {
  if (style.font) cell.font = { ...cell.font, ...style.font }
  if (style.fill) cell.fill = style.fill
  if (style.alignment) cell.alignment = style.alignment
  if (style.border) cell.border = { ...cell.border, ...style.border }
  if (style.numFmt) cell.numFmt = style.numFmt
}

export function applyRowStyle(row: Row, style: ExcelColumnStyle): void {
  row.eachCell((cell) => {
    applyCellStyle(cell, style)
  })
}

export function applyHeaderStyle(row: Row): void {
  row.height = EXCEL_DEFAULTS.headerRowHeight
  row.eachCell((cell) => {
    cell.font = EXCEL_FONTS.header
    cell.fill = EXCEL_HEADER_FILL
    cell.alignment = EXCEL_ALIGNMENT.center
    cell.border = EXCEL_BORDERS
  })
}

export function applyBodyBorder(cell: Cell): void {
  cell.border = EXCEL_BORDERS
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function autoFitColumns(columns: Partial<Column>[], data: any[][]): void {
  columns.forEach((col, i) => {
    if (!col.width) {
      let maxLen = (col.header?.toString().length ?? 0) + 2
      for (const row of data) {
        const val = row[i]?.toString() ?? ''
        maxLen = Math.max(maxLen, val.length + 2)
      }
      col.width = Math.min(Math.max(maxLen, 10), 50)
    }
  })
}

export function getStatusExcelConfig(status: string): { font: Partial<typeof EXCEL_FONTS.body> } {
  const configs: Record<string, { color: string; bg: string }> = {
    Pendiente: { color: 'FFF59E0B', bg: 'FFFFF8E1' },
    Aprobado: { color: 'FF1E3A8A', bg: 'FFE8EEF5' },
    Aprobada: { color: 'FF1E3A8A', bg: 'FFE8EEF5' },
    Completada: { color: 'FF16A34A', bg: 'FFE6F7E6' },
    Completado: { color: 'FF16A34A', bg: 'FFE6F7E6' },
    Cancelada: { color: 'FFE11D48', bg: 'FFFEE8EB' },
    Cancelado: { color: 'FFE11D48', bg: 'FFFEE8EB' },
  }
  const cfg = configs[status]
  if (!cfg) return { font: EXCEL_FONTS.body }
  return {
    font: { ...EXCEL_FONTS.bodyBold, color: { argb: cfg.color } },
  }
}
