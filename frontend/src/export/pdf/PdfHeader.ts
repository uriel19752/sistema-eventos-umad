import jsPDF from 'jspdf'
import { PDF_COLORS, PDF_FONTS, PDF_MARGINS } from './PdfTheme'

export interface HeaderOptions {
  title: string
  subtitle?: string
  institution?: string
  date?: string
  showLogo?: boolean
  logoSrc?: string
}

export function addPageHeader(
  doc: jsPDF,
  title: string,
  pageInfo?: string,
): void {
  const pw = doc.internal.pageSize.getWidth()

  doc.setFillColor(PDF_COLORS.primary)
  doc.rect(0, 0, pw, 10, 'F')

  doc.setFont(PDF_FONTS.family, 'bold')
  doc.setFontSize(PDF_FONTS.sizes.pageHeader)
  doc.setTextColor(PDF_COLORS.textWhite)
  doc.text(title.toUpperCase(), PDF_MARGINS.left, 6.5)

  if (pageInfo) {
    doc.setFont(PDF_FONTS.family, 'normal')
    doc.setFontSize(6.5)
    doc.setTextColor(PDF_COLORS.textWhite)
    doc.text(pageInfo, pw - PDF_MARGINS.right, 6.5, { align: 'right' })
  }
}

export function addCoverHeader(
  doc: jsPDF,
  title: string,
  subtitle: string,
): void {
  const pw = doc.internal.pageSize.getWidth()

  doc.setFillColor(PDF_COLORS.coverBg1)
  doc.rect(0, 0, pw, 45, 'F')

  doc.setFont(PDF_FONTS.family, 'bold')
  doc.setFontSize(24)
  doc.setTextColor(PDF_COLORS.textWhite)
  doc.text(title, PDF_MARGINS.left, 20)

  doc.setFont(PDF_FONTS.family, 'normal')
  doc.setFontSize(12)
  doc.setTextColor(PDF_COLORS.textWhite)
  doc.text(subtitle, PDF_MARGINS.left, 30)
}

export function addPageNumberedHeader(
  doc: jsPDF,
  title: string,
  pageNum: number,
  totalPages: number,
): void {
  addPageHeader(doc, title, `Pág. ${pageNum} de ${totalPages}`)
}
