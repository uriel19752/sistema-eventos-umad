import type { Worksheet, Row, Column } from 'exceljs'
import {
  EXCEL_FONTS,
  EXCEL_ALIGNMENT,
  EXCEL_DEFAULTS,
  EXCEL_ROW_EVEN_FILL,
  type ExcelColumnStyle,
} from './ExcelTheme'
import { applyHeaderStyle, autoFitColumns } from './ExcelUtils'

export interface ExcelColumnDef {
  header: string
  dataKey: string
  width?: number
  align?: 'left' | 'center' | 'right'
  style?: ExcelColumnStyle
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  format?: (value: any) => string | number
}

export interface ExcelTableOptions {
  startRow?: number
  striped?: boolean
  headerStyle?: ExcelColumnStyle
  bodyStyle?: ExcelColumnStyle
  autoWidth?: boolean
  showHeader?: boolean
}

export function addExcelTable(
  sheet: Worksheet,
  columns: ExcelColumnDef[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>[],
  options: ExcelTableOptions = {},
): Row {
  const startRow = options.startRow ?? 1
  const showHeader = options.showHeader !== false
  const striped = options.striped !== false
  const autoWidth = options.autoWidth !== false

  sheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.dataKey,
    width: col.width ?? EXCEL_DEFAULTS.columnWidth,
  }))

  if (showHeader) {
    const headerRow = sheet.getRow(startRow)
    headerRow.values = columns.map((c) => c.header)
    applyHeaderStyle(headerRow)

    columns.forEach((col, i) => {
      if (col.align) {
        const cell = headerRow.getCell(i + 1)
        cell.alignment =
          col.align === 'center'
            ? EXCEL_ALIGNMENT.center
            : col.align === 'right'
              ? EXCEL_ALIGNMENT.right
              : EXCEL_ALIGNMENT.left
      }
    })
  }

  data.forEach((item, dataIdx) => {
    const rowNum = startRow + (showHeader ? 1 : 0) + dataIdx
    const row = sheet.getRow(rowNum)

    columns.forEach((col, colIdx) => {
      let value = item[col.dataKey]
      if (col.format) {
        value = col.format(value)
      }
      const cell = row.getCell(colIdx + 1)
      cell.value = value ?? '—'

      if (col.align) {
        cell.alignment =
          col.align === 'center'
            ? EXCEL_ALIGNMENT.center
            : col.align === 'right'
              ? EXCEL_ALIGNMENT.right
              : EXCEL_ALIGNMENT.left
      }

      if (striped && dataIdx % 2 === 1) {
        cell.fill = EXCEL_ROW_EVEN_FILL
      }
    })
  })

  if (autoWidth) {
    const rawData = data.map((item) => columns.map((c) => item[c.dataKey]))
    autoFitColumns(sheet.columns as Partial<Column>[], rawData)
  }

  return sheet.getRow(startRow)
}

export function addExcelTitleRow(
  sheet: Worksheet,
  title: string,
  rowNum: number = 1,
  mergeToCol: number = 2,
): void {
  const row = sheet.getRow(rowNum)
  row.height = EXCEL_DEFAULTS.titleRowHeight
  const cell = row.getCell(1)
  cell.value = title
  cell.font = EXCEL_FONTS.title
  cell.alignment = EXCEL_ALIGNMENT.left

  if (mergeToCol > 1) {
    sheet.mergeCells(rowNum, 1, rowNum, mergeToCol)
  }
}

export function addExcelSubtitleRow(
  sheet: Worksheet,
  subtitle: string,
  rowNum: number = 2,
  mergeToCol: number = 2,
): void {
  const row = sheet.getRow(rowNum)
  const cell = row.getCell(1)
  cell.value = subtitle
  cell.font = EXCEL_FONTS.subtitle
  cell.alignment = EXCEL_ALIGNMENT.left

  if (mergeToCol > 1) {
    sheet.mergeCells(rowNum, 1, rowNum, mergeToCol)
  }
}
