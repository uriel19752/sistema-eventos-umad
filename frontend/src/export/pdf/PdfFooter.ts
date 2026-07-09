import jsPDF from 'jspdf'
import { PDF_COLORS, PDF_FONTS, PDF_MARGINS } from './PdfTheme'
import { formatDate, formatTime } from './PdfUtils'

export interface FooterOptions {
  genDate?: string
  genTime?: string
  systemName?: string
}

export function addFooter(
  doc: jsPDF,
  pageNum: number,
  totalPages: number,
  options?: FooterOptions,
): void {
  const pw = doc.internal.pageSize.getWidth()
  const ph = doc.internal.pageSize.getHeight()

  const date = options?.genDate ?? formatDate(new Date())
  const time = options?.genTime ?? formatTime(new Date())
  const systemName = options?.systemName ?? 'TigreTrack'

  const footerText = `Página ${pageNum} de ${totalPages} | ${date} ${time} | ${systemName}`

  doc.setFont(PDF_FONTS.family, 'normal')
  doc.setFontSize(PDF_FONTS.sizes.footer)
  doc.setTextColor(PDF_COLORS.textLight)

  doc.text(footerText, pw / 2, ph - PDF_MARGINS.footer, { align: 'center' })

  doc.setDrawColor(PDF_COLORS.border)
  doc.setLineWidth(0.3)
  doc.line(
    PDF_MARGINS.left,
    ph - PDF_MARGINS.footer - 2.5,
    pw - PDF_MARGINS.right,
    ph - PDF_MARGINS.footer - 2.5,
  )
}

export function finalizeFooters(
  doc: jsPDF,
  options?: FooterOptions,
): void {
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    addFooter(doc, i, totalPages, options)
  }
}
