import jsPDF from 'jspdf'
import 'jspdf-autotable'
import {
  PDF_COLORS,
  PDF_FONTS,
  PDF_MARGINS,
  PDF_PAGE,
  PDF_SPACING,
} from './PdfTheme'
import { addPageHeader } from './PdfHeader'
import { finalizeFooters, type FooterOptions } from './PdfFooter'
import { addTable, type ColumnDef, type TableOptions } from './PdfTables'
import { addChartImageToDoc, type ChartImageOptions } from './PdfCharts'
import { formatDate, formatTime } from './PdfUtils'

export interface ReportOptions {
  author?: string
  title?: string
  subject?: string
  keywords?: string[]
  margins?: Partial<typeof PDF_MARGINS>
  headerFooter?: boolean
  footerOptions?: FooterOptions
}

export interface KpiCard {
  label: string
  value: number | string
  color: string
  bg?: string
}

export interface InsightCard {
  label: string
  value: string
  desc: string
  color: string
  icon?: string
}

const DEFAULT_OPTIONS: Required<ReportOptions> = {
  author: 'TigreTrack',
  title: 'Reporte',
  subject: 'Reporte generado por TigreTrack',
  keywords: ['TigreTrack', 'reporte', 'estadísticas'],
  margins: PDF_MARGINS,
  headerFooter: true,
  footerOptions: {},
}

export class PdfReport {
  protected doc: jsPDF
  protected options: Required<ReportOptions>
  protected pageWidth: number
  protected pageHeight: number
  protected margins: typeof PDF_MARGINS
  protected currentY: number
  protected genDate: string
  protected genTime: string
  protected isFinalized: boolean = false

  constructor(options: ReportOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options, footerOptions: { ...DEFAULT_OPTIONS.footerOptions, ...options.footerOptions } }
    this.margins = { ...PDF_MARGINS, ...this.options.margins }

    this.doc = new jsPDF({
      orientation: PDF_PAGE.orientation,
      unit: 'mm',
      format: PDF_PAGE.format,
    })

    this.pageWidth = this.doc.internal.pageSize.getWidth()
    this.pageHeight = this.doc.internal.pageSize.getHeight()

    this.doc.setFont(PDF_FONTS.family, 'normal')

    this.doc.setProperties({
      title: this.options.title,
      subject: this.options.subject,
      author: this.options.author,
      keywords: this.options.keywords.join(', '),
      creator: 'TigreTrack — Sistema de Gestión de Eventos UMAD',
    })

    const now = new Date()
    this.genDate = formatDate(now)
    this.genTime = formatTime(now)

    this.currentY = this.margins.top
  }

  addPage(): void {
    this.doc.addPage()
    this.currentY = this.margins.top
    this.isFinalized = false
  }

  addHeader(title: string, subtitle?: string): void {
    addPageHeader(this.doc, title, subtitle)
    this.currentY = this.margins.top + 2
  }

  addSectionTitle(text: string): void {
    const needed = 15
    this.checkSpace(needed)

    this.doc.setFont(PDF_FONTS.family, 'bold')
    this.doc.setFontSize(PDF_FONTS.sizes.sectionTitle)
    this.doc.setTextColor(PDF_COLORS.primary)
    this.doc.text(text, this.margins.left, this.currentY)
    this.currentY += 4

    this.doc.setDrawColor(PDF_COLORS.accent)
    this.doc.setLineWidth(0.5)
    const lineY = this.currentY
    this.doc.line(
      this.margins.left,
      lineY,
      this.pageWidth - this.margins.right,
      lineY,
    )
    this.currentY += PDF_SPACING.afterSectionTitle
  }

  addSubsectionTitle(text: string): void {
    const needed = 12
    this.checkSpace(needed)

    this.doc.setFont(PDF_FONTS.family, 'bold')
    this.doc.setFontSize(PDF_FONTS.sizes.subsectionTitle)
    this.doc.setTextColor(PDF_COLORS.textPrimary)
    this.doc.text(text, this.margins.left, this.currentY)

    this.doc.setDrawColor(PDF_COLORS.border)
    this.doc.setLineWidth(0.3)
    const lineY = this.currentY + 1.5
    this.doc.line(
      this.margins.left,
      lineY,
      this.pageWidth - this.margins.right,
      lineY,
    )
    this.currentY += 7
  }

  addBodyText(
    text: string,
    options?: {
      align?: 'left' | 'justify' | 'center'
      fontSize?: number
      color?: string
      bold?: boolean
    },
  ): void {
    const fontSize = options?.fontSize ?? PDF_FONTS.sizes.body
    const color = options?.color ?? PDF_COLORS.textSecondary
    const align = options?.align ?? 'justify'
    const maxWidth = this.pageWidth - this.margins.left - this.margins.right

    const lines = this.doc.splitTextToSize(text, maxWidth)
    const lineHeight = fontSize * 0.3528
    const height = lines.length * lineHeight * PDF_SPACING.lineHeight

    this.checkSpace(height + 4)

    this.doc.setFont(PDF_FONTS.family, options?.bold ? 'bold' : 'normal')
    this.doc.setFontSize(fontSize)
    this.doc.setTextColor(color)
    this.doc.text(lines, this.margins.left, this.currentY, {
      align,
      maxWidth,
    })

    this.currentY += height + PDF_SPACING.afterParagraph
  }

  addRichParagraph(
    parts: { text: string; bold?: boolean; color?: string; fontSize?: number }[],
    align: 'left' | 'justify' | 'center' = 'justify',
  ): void {
    const maxWidth = this.pageWidth - this.margins.left - this.margins.right
    let totalHeight = 0

    for (const part of parts) {
      const fs = part.fontSize ?? PDF_FONTS.sizes.body
      const lh = fs * 0.3528 * PDF_SPACING.lineHeight
      const lines = this.doc.splitTextToSize(part.text, maxWidth)
      totalHeight += lines.length * lh
    }

    this.checkSpace(totalHeight + 4)

    for (const part of parts) {
      const fs = part.fontSize ?? PDF_FONTS.sizes.body
      const c = part.color ?? PDF_COLORS.textSecondary
      const lh = fs * 0.3528 * PDF_SPACING.lineHeight
      const lines = this.doc.splitTextToSize(part.text, maxWidth)

      this.doc.setFont(PDF_FONTS.family, part.bold ? 'bold' : 'normal')
      this.doc.setFontSize(fs)
      this.doc.setTextColor(c)
      this.doc.text(lines, this.margins.left, this.currentY, { align })

      this.currentY += lines.length * lh
    }

    this.currentY += PDF_SPACING.afterParagraph
  }

  addTable(
    columns: ColumnDef[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: Record<string, any>[],
    options: TableOptions = {},
  ): void {
    const estimatedHeight = Math.min(data.length, 25) * 7 + 20
    this.checkSpace(estimatedHeight)

    const y = addTable(this.doc, columns, data, {
      ...options,
      startY: options.startY ?? this.currentY,
    })

    this.currentY = y + PDF_SPACING.afterTable
  }

  addChartImage(
    dataUrl: string,
    options?: ChartImageOptions,
  ): void {
    const imgWidth = options?.width ?? (this.pageWidth - this.margins.left - this.margins.right)
    const aspectRatio = 0.6
    const imgHeight = imgWidth * aspectRatio
    const needed = imgHeight + (options?.title ? 10 : 0) + 10

    this.checkSpace(needed)

    if (options?.title) {
      this.doc.setFont(PDF_FONTS.family, 'bold')
      this.doc.setFontSize(PDF_FONTS.sizes.subsectionTitle)
      this.doc.setTextColor(PDF_COLORS.textPrimary)
      this.doc.text(options.title, this.margins.left, this.currentY)
      this.currentY += 7
    }

    const y = addChartImageToDoc(this.doc, dataUrl, {
      ...options,
      y: this.currentY,
    })

    this.currentY = y + PDF_SPACING.afterChart
  }

  addKpiCards(kpis: KpiCard[]): void {
    if (kpis.length === 0) return

    const ml = this.margins.left
    const mr = this.margins.right
    const available = this.pageWidth - ml - mr
    const gap = 3
    const n = kpis.length
    const cardW = (available - gap * (n - 1)) / n
    const cardH = 22
    const pad = 4
    const innerW = cardW - pad * 2
    const accentH = 1.5

    this.checkSpace(cardH + 8)

    for (let i = 0; i < n; i++) {
      const kpi = kpis[i]
      const x = ml + i * (cardW + gap)
      const [cr, cg, cb] = hexToRgbArr(kpi.color)
      const valStr = String(kpi.value)
      const isLong = valStr.length > 15

      // White background
      this.doc.setFillColor(255, 255, 255)
      this.doc.roundedRect(x, this.currentY, cardW, cardH, 3, 3, 'F')

      // Border — primary color
      this.doc.setDrawColor(30, 58, 138)
      this.doc.setLineWidth(0.3)
      this.doc.roundedRect(x, this.currentY, cardW, cardH, 3, 3, 'S')

      // Coloured accent bar at top
      this.doc.setFillColor(cr, cg, cb)
      this.doc.rect(x + 2, this.currentY + 2, cardW - 4, accentH, 'F')

      // KPI value — with auto-wrap and dynamic font size
      this.doc.setFont(PDF_FONTS.family, 'bold')
      this.doc.setFontSize(isLong ? 8 : PDF_FONTS.sizes.kpiValue)
      this.doc.setTextColor(cr, cg, cb)
      const valLines = this.doc.splitTextToSize(valStr, innerW)
      this.doc.text(valLines, x + pad, this.currentY + 11, { maxWidth: innerW })

      // KPI label
      this.doc.setFont(PDF_FONTS.family, 'normal')
      this.doc.setFontSize(PDF_FONTS.sizes.kpiLabel)
      this.doc.setTextColor(100, 116, 139)
      this.doc.text(kpi.label.toUpperCase(), x + pad, this.currentY + 18.5, { maxWidth: innerW })
    }

    this.currentY += cardH + PDF_SPACING.afterKpi
  }

  addInsightCards(insights: InsightCard[]): void {
    if (insights.length === 0) return

    const ml = this.margins.left
    const mr = this.margins.right
    const available = this.pageWidth - ml - mr
    const colGap = 4
    const colW = (available - colGap) / 2
    const cardH = 20
    const rows = Math.ceil(insights.length / 2)
    const totalH = rows * (cardH + 4)

    this.checkSpace(totalH)

    for (let i = 0; i < insights.length; i += 2) {
      const rowY = this.currentY

      for (let j = 0; j < 2 && i + j < insights.length; j++) {
        const card = insights[i + j]
        const cx = ml + j * (colW + colGap)
        const [ir, ig, ib] = hexToRgbArr(card.color)

        // White background
        this.doc.setFillColor(255, 255, 255)
        this.doc.roundedRect(cx, rowY, colW, cardH, 2, 2, 'F')

        // Border — light gray
        this.doc.setDrawColor(226, 232, 240)
        this.doc.setLineWidth(0.2)
        this.doc.roundedRect(cx, rowY, colW, cardH, 2, 2, 'S')

        // Left accent bar
        this.doc.setFillColor(ir, ig, ib)
        this.doc.rect(cx + 0.5, rowY + 2, 1.5, cardH - 4, 'F')

        const textX = cx + 5

        const insTextW = colW - 6

        // Label
        this.doc.setFont(PDF_FONTS.family, 'normal')
        this.doc.setFontSize(6.5)
        this.doc.setTextColor(100, 116, 139)
        this.doc.text(card.label.toUpperCase(), textX, rowY + 5.5, { maxWidth: insTextW })

        // Value
        this.doc.setFont(PDF_FONTS.family, 'bold')
        this.doc.setFontSize(PDF_FONTS.sizes.insightValue)
        this.doc.setTextColor(15, 23, 42)
        this.doc.text(card.value, textX, rowY + 12.5, { maxWidth: insTextW })

        // Description
        this.doc.setFont(PDF_FONTS.family, 'normal')
        this.doc.setFontSize(6.5)
        this.doc.setTextColor(100, 116, 139)
        const descLines = this.doc.splitTextToSize(card.desc, insTextW)
        this.doc.text(descLines, textX, rowY + 17.5, { maxWidth: insTextW })
      }

      this.currentY += cardH + 4
    }

    this.currentY += PDF_SPACING.afterInsight
  }

  addSeparator(): void {
    this.checkSpace(6)
    this.doc.setDrawColor(PDF_COLORS.border)
    this.doc.setLineWidth(0.3)
    this.doc.line(
      this.margins.left,
      this.currentY,
      this.pageWidth - this.margins.right,
      this.currentY,
    )
    this.currentY += 5
  }

  checkSpace(needed: number): boolean {
    if (this.currentY + needed > this.pageHeight - this.margins.bottom) {
      this.addPage()
      return true
    }
    return false
  }

  getRemainingSpace(): number {
    return this.pageHeight - this.margins.bottom - this.currentY
  }

  finalize(): void {
    if (this.isFinalized) return
    this.isFinalized = true

    if (this.options.headerFooter) {
      finalizeFooters(this.doc, {
        genDate: this.genDate,
        genTime: this.genTime,
        systemName: 'TigreTrack',
        ...this.options.footerOptions,
      })
    }
  }

  save(filename: string): void {
    this.finalize()
    this.doc.save(filename)
  }

  async outputBlob(): Promise<Blob> {
    this.finalize()
    return this.doc.output('blob')
  }

  async outputDataUri(): Promise<string> {
    this.finalize()
    return this.doc.output('datauristring')
  }

  async outputArrayBuffer(): Promise<ArrayBuffer> {
    this.finalize()
    return this.doc.output('arraybuffer')
  }

  getDoc(): jsPDF {
    return this.doc
  }

  getCurrentY(): number {
    return this.currentY
  }

  setCurrentY(y: number): void {
    this.currentY = y
  }
}

function hexToRgbArr(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16)
    const g = parseInt(clean[1] + clean[1], 16)
    const b = parseInt(clean[2] + clean[2], 16)
    return [r, g, b]
  }
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(clean)
  if (!result) return [0, 0, 0]
  return [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
}
