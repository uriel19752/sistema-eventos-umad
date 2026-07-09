export const PDF_COLORS = {
  primary: '#1E3A8A',
  primaryDark: '#0F2B6B',
  primaryLight: '#2563EB',
  accent: '#E11D48',
  success: '#16A34A',
  warning: '#F59E0B',
  error: '#DC2626',
  textPrimary: '#0F172A',
  textSecondary: '#334155',
  textMuted: '#64748B',
  textLight: '#94A3B8',
  textWhite: '#FFFFFF',
  border: '#E2E8F0',
  background: '#F8FAFC',
  surface: '#FFFFFF',
  rowEven: '#F8FAFC',
  rowOdd: '#FFFFFF',
  headerBg: '#1E3A8A',
  coverBg1: '#0A1F5E',
  coverBg2: '#2563EB',
} as const

export const PDF_FONTS = {
  family: 'helvetica',
  bold: 'helvetica',
  sizes: {
    coverTitle: 36,
    coverSubtitle: 16,
    coverMeta: 11,
    sectionTitle: 15,
    subsectionTitle: 12,
    body: 10,
    small: 8,
    xsmall: 7,
    tableHeader: 7,
    tableBody: 8.5,
    footer: 6.5,
    kpiValue: 13,
    kpiLabel: 7.5,
    insightValue: 12,
    pageHeader: 8,
  },
} as const

export const PDF_MARGINS = {
  top: 20,
  bottom: 20,
  left: 15,
  right: 15,
  header: 15,
  footer: 12,
  bodyLeft: 18,
  bodyRight: 18,
} as const

export const PDF_PAGE = {
  width: 210,
  height: 297,
  orientation: 'portrait' as const,
  format: 'a4' as const,
} as const

export const PDF_SPACING = {
  afterSectionTitle: 8,
  afterParagraph: 4,
  afterTable: 10,
  afterChart: 10,
  afterKpi: 16,
  afterInsight: 10,
  lineHeight: 1.5,
  coverDivider: 4,
} as const

export type PdfThemeColors = typeof PDF_COLORS
export type PdfThemeFonts = typeof PDF_FONTS
export type PdfThemeMargins = typeof PDF_MARGINS
export type PdfThemePage = typeof PDF_PAGE
export type PdfThemeSpacing = typeof PDF_SPACING
