import type { Font, Fill, Border, Alignment } from 'exceljs'

export const EXCEL_COLORS = {
  primary: 'FF1E3A8A',
  primaryDark: 'FF0F2B6B',
  primaryLight: 'FF2563EB',
  accent: 'FFE11D48',
  success: 'FF16A34A',
  warning: 'FFF59E0B',
  error: 'FFDC2626',
  textPrimary: 'FF0F172A',
  textSecondary: 'FF334155',
  textMuted: 'FF64748B',
  textWhite: 'FFFFFFFF',
  border: 'FFE2E8F0',
  background: 'FFF8FAFC',
  surface: 'FFFFFFFF',
  rowEven: 'FFF8FAFC',
  rowOdd: 'FFFFFFFF',
  headerBg: 'FF1E3A8A',
} as const

export const EXCEL_FONTS = {
  title: { name: 'Calibri', size: 16, bold: true, color: { argb: EXCEL_COLORS.primary } } as Font,
  subtitle: { name: 'Calibri', size: 11, color: { argb: EXCEL_COLORS.textMuted } } as Font,
  header: { name: 'Calibri', size: 11, bold: true, color: { argb: EXCEL_COLORS.textWhite } } as Font,
  body: { name: 'Calibri', size: 10, color: { argb: EXCEL_COLORS.textPrimary } } as Font,
  bodyBold: { name: 'Calibri', size: 10, bold: true, color: { argb: EXCEL_COLORS.textPrimary } } as Font,
  small: { name: 'Calibri', size: 9, color: { argb: EXCEL_COLORS.textMuted } } as Font,
  kpi: { name: 'Calibri', size: 14, bold: true, color: { argb: EXCEL_COLORS.primary } } as Font,
} as const

export const EXCEL_HEADER_FILL: Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: EXCEL_COLORS.headerBg },
}

export const EXCEL_ROW_EVEN_FILL: Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: EXCEL_COLORS.rowEven },
}

export const EXCEL_BORDER_STYLE: Partial<Border> = {
  style: 'thin',
  color: { argb: EXCEL_COLORS.border },
}

export const EXCEL_BORDERS = {
  top: { style: 'thin' as const, color: { argb: EXCEL_COLORS.border } },
  left: { style: 'thin' as const, color: { argb: EXCEL_COLORS.border } },
  bottom: { style: 'thin' as const, color: { argb: EXCEL_COLORS.border } },
  right: { style: 'thin' as const, color: { argb: EXCEL_COLORS.border } },
}

export const EXCEL_ALIGNMENT = {
  center: { horizontal: 'center' as const, vertical: 'middle' as const } as Alignment,
  left: { horizontal: 'left' as const, vertical: 'middle' as const } as Alignment,
  right: { horizontal: 'right' as const, vertical: 'middle' as const } as Alignment,
}

export const EXCEL_DEFAULTS = {
  columnWidth: 20,
  rowHeight: 20,
  headerRowHeight: 25,
  titleRowHeight: 30,
  sheetView: { state: 'frozen' as const, ySplit: 1 },
}

export interface ExcelColumnStyle {
  font?: Partial<Font>
  fill?: Fill
  alignment?: Alignment
  border?: Partial<Border>
  numFmt?: string
}

export function createHeaderStyle(): ExcelColumnStyle {
  return {
    font: EXCEL_FONTS.header,
    fill: EXCEL_HEADER_FILL,
    alignment: EXCEL_ALIGNMENT.center,
    border: EXCEL_BORDER_STYLE,
  }
}

export function createBodyStyle(): ExcelColumnStyle {
  return {
    font: EXCEL_FONTS.body,
    alignment: EXCEL_ALIGNMENT.left,
    border: EXCEL_BORDER_STYLE,
  }
}
