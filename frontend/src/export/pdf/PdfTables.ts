import jsPDF from 'jspdf'
import { autoTable, type Styles, type FontStyle, type PageHook } from 'jspdf-autotable'
import { PDF_COLORS, PDF_FONTS, PDF_MARGINS } from './PdfTheme'

export interface ColumnDef {
  header: string
  dataKey: string
  width?: number
  align?: 'left' | 'center' | 'right'
  style?: {
    fontSize?: number
    fontStyle?: FontStyle
    textColor?: string
    fillColor?: string
    cellWidth?: number
  }
}

export interface TableOptions {
  startY?: number
  margin?: { top?: number; bottom?: number; left?: number; right?: number }
  pageBreak?: 'auto' | 'avoid'
  showHeader?: 'everyPage' | 'firstPage' | 'never'
  striped?: boolean
  headerStyle?: Partial<Styles>
  bodyStyle?: Partial<Styles>
  alternateStyle?: Partial<Styles>
  columnStyles?: Record<string, Partial<Styles>>
  didDrawPage?: PageHook
  rowPageBreak?: 'auto' | 'avoid'
}

export function addTable(
  doc: jsPDF,
  columns: ColumnDef[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>[],
  options: TableOptions = {},
): number {
  const headers = columns.map((c) => c.header)
  const rows = data.map((item) => columns.map((c) => item[c.dataKey] ?? '—'))

  const colStyles: Record<string, Partial<Styles>> = {}
  columns.forEach((col, i) => {
    const style: Partial<Styles> = {}
    if (col.width) style.cellWidth = col.width
    if (col.align) style.halign = col.align
    if (col.style?.fontSize) style.fontSize = col.style.fontSize
    if (col.style?.textColor) style.textColor = hexToRgbArr(col.style.textColor)
    if (col.style?.fillColor) style.fillColor = hexToRgbArr(col.style.fillColor)
    if (Object.keys(style).length > 0) colStyles[String(i)] = style
    if (options.columnStyles?.[String(i)]) {
      colStyles[String(i)] = { ...colStyles[String(i)], ...options.columnStyles[String(i)] }
    }
  })

  autoTable(doc, {
    head: [headers],
    body: rows,
    startY: options.startY,
    margin: options.margin ?? {
      left: PDF_MARGINS.left,
      right: PDF_MARGINS.right,
    },
    tableWidth: doc.internal.pageSize.getWidth() - PDF_MARGINS.left - PDF_MARGINS.right,
    pageBreak: options.pageBreak ?? 'auto',
    rowPageBreak: options.rowPageBreak ?? 'auto',
    showHead: options.showHeader ?? 'everyPage',
    styles: {
      fontSize: PDF_FONTS.sizes.tableBody,
      font: PDF_FONTS.family,
      fontStyle: 'normal',
      cellPadding: 2.5,
      lineColor: hexToRgbArr(PDF_COLORS.border),
      lineWidth: 0.1,
      textColor: hexToRgbArr(PDF_COLORS.textPrimary),
      halign: 'left',
      valign: 'middle',
      minCellHeight: 6,
      ...options.bodyStyle,
    },
    headStyles: {
      fillColor: hexToRgbArr(PDF_COLORS.headerBg),
      textColor: hexToRgbArr(PDF_COLORS.textWhite),
      fontStyle: 'bold',
      fontSize: PDF_FONTS.sizes.tableHeader,
      halign: 'center',
      valign: 'middle',
      cellPadding: 3,
      ...options.headerStyle,
    },
    columnStyles: colStyles,
    ...(options.striped !== false
      ? {
          alternateRowStyles: {
            fillColor: hexToRgbArr(PDF_COLORS.rowEven),
            ...options.alternateStyle,
          },
        }
      : {}),
    didDrawPage: options.didDrawPage,
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable?.finalY ?? 0
  return finalY + 10
}

export function addSimpleTable(
  doc: jsPDF,
  headers: string[],
  rows: (string | number)[][],
  options: TableOptions = {},
): number {
  const columns: ColumnDef[] = headers.map((h) => ({
    header: h,
    dataKey: h,
    align: 'left',
  }))
  const data = rows.map((row) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const item: Record<string, any> = {}
    headers.forEach((h, i) => {
      item[h] = row[i] ?? '—'
    })
    return item
  })
  return addTable(doc, columns, data, options)
}

export function addKeyValueTable(
  doc: jsPDF,
  items: { label: string; value: string; color?: string }[],
  options: TableOptions = {},
): number {
  const data = items.map((item) => ({
    label: item.label,
    value: item.value,
  }))
  return addTable(
    doc,
    [
      { header: 'Métrica', dataKey: 'label', width: 100, style: { fontStyle: 'bold' } },
      { header: 'Valor', dataKey: 'value', align: 'center' },
    ],
    data,
    { ...options, striped: true },
  )
}

function hexToRgbArr(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) return [0, 0, 0]
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
}
