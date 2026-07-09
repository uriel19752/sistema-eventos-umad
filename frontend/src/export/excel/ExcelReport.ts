import ExcelJS, { type Workbook, type Worksheet } from 'exceljs'
import { formatDateTime } from './ExcelUtils'
import {
  EXCEL_FONTS,
  EXCEL_ALIGNMENT,
  EXCEL_DEFAULTS,
} from './ExcelTheme'
import {
  addExcelTable,
  addExcelTitleRow,
  addExcelSubtitleRow,
  type ExcelColumnDef,
  type ExcelTableOptions,
} from './ExcelTables'

export interface ExcelReportOptions {
  author?: string
  title?: string
  date?: Date
}

export interface ExcelSheetDef {
  name: string
  columns: ExcelColumnDef[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>[]
  title?: string
  subtitle?: string
  options?: ExcelTableOptions
}

const DEFAULT_OPTIONS: Required<ExcelReportOptions> = {
  author: 'TigreTrack',
  title: 'Reporte',
  date: new Date(),
}

export class ExcelReport {
  protected workbook: Workbook
  protected options: Required<ExcelReportOptions>
  protected sheets: Map<string, Worksheet> = new Map()

  constructor(options: ExcelReportOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options }
    this.workbook = new ExcelJS.Workbook()
    this.workbook.creator = this.options.author
    this.workbook.created = this.options.date
  }

  addSheet(name: string): Worksheet {
    if (this.sheets.has(name)) {
      return this.sheets.get(name)!
    }
    const sheet = this.workbook.addWorksheet(name)
    this.sheets.set(name, sheet)
    return sheet
  }

  addTableToSheet(
    sheetName: string,
    columns: ExcelColumnDef[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: Record<string, any>[],
    options?: ExcelTableOptions,
  ): void {
    const sheet = this.sheets.get(sheetName) ?? this.addSheet(sheetName)
    addExcelTable(sheet, columns, data, options)
  }

  addFullSheet(def: ExcelSheetDef): Worksheet {
    const sheet = this.addSheet(def.name)

    let startRow = 1

    if (def.title) {
      addExcelTitleRow(sheet, def.title, startRow, def.columns.length)
      startRow++
    }

    if (def.subtitle) {
      addExcelSubtitleRow(sheet, def.subtitle, startRow, def.columns.length)
      startRow++
      startRow++
    }

    addExcelTable(sheet, def.columns, def.data, {
      ...def.options,
      startRow,
    })

    sheet.views = [{ state: EXCEL_DEFAULTS.sheetView.state, ySplit: startRow }]

    return sheet
  }

  addDashboardSheet(
    sheetName: string,
    title: string,
    kpis: { label: string; value: number | string }[],
  ): Worksheet {
    const sheet = this.addSheet(sheetName)

    addExcelTitleRow(sheet, title, 1, 4)
    const subCell = sheet.getRow(2).getCell(1)
    subCell.value = `Generado el ${formatDateTime(new Date().toISOString())}`
    subCell.font = EXCEL_FONTS.subtitle

    sheet.getRow(4).height = 8

    const headerRow = sheet.getRow(5)
    headerRow.getCell(1).value = 'Métrica'
    headerRow.getCell(2).value = 'Valor'
    headerRow.eachCell((cell) => {
      cell.font = EXCEL_FONTS.header
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }
      cell.alignment = EXCEL_ALIGNMENT.center
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      }
    })

    kpis.forEach((kpi, idx) => {
      const r = sheet.getRow(6 + idx)
      r.getCell(1).value = kpi.label
      r.getCell(2).value = kpi.value
      r.eachCell((cell) => {
        cell.font = EXCEL_FONTS.body
        cell.alignment = EXCEL_ALIGNMENT.center
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        }
      })
    })

    sheet.getColumn(1).width = 30
    sheet.getColumn(2).width = 15

    return sheet
  }

  async save(filename: string): Promise<void> {
    const buffer = await this.workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.URL.revokeObjectURL(url)
  }

  async toBlob(): Promise<Blob> {
    const buffer = await this.workbook.xlsx.writeBuffer()
    return new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
  }

  async toBuffer(): Promise<ArrayBuffer> {
    return this.workbook.xlsx.writeBuffer()
  }

  getSheet(name: string): Worksheet | undefined {
    return this.sheets.get(name)
  }

  addImageToSheet(
    sheetName: string,
    dataUrl: string,
    tl: { col: number; row: number },
    ext: { width: number; height: number },
  ): void {
    const sheet = this.sheets.get(sheetName)
    if (!sheet) {
      console.warn(`ExcelReport: sheet "${sheetName}" not found, skipping image`)
      return
    }
    const match = dataUrl.match(/^data:image\/(png|jpeg|jpg);base64,(.+)$/)
    if (!match) {
      console.warn('ExcelReport: invalid image dataUrl format')
      return
    }
    const extName = match[1] === 'jpeg' ? 'jpeg' : 'png'
    const rawBase64 = match[2]
    const imageId = this.workbook.addImage({ base64: rawBase64, extension: extName })
    sheet.addImage(imageId, { tl, ext })
  }

  getWorkbook(): Workbook {
    return this.workbook
  }
}
