// ──────────────────────────────────────────────
//  PDF — Infrastructure
// ──────────────────────────────────────────────
export {
  PDF_COLORS,
  PDF_FONTS,
  PDF_MARGINS,
  PDF_PAGE,
  PDF_SPACING,
} from './pdf/PdfTheme'
export type {
  PdfThemeColors,
  PdfThemeFonts,
  PdfThemeMargins,
  PdfThemePage,
  PdfThemeSpacing,
} from './pdf/PdfTheme'

export {
  addPageHeader,
  addCoverHeader,
  addPageNumberedHeader,
} from './pdf/PdfHeader'
export type { HeaderOptions } from './pdf/PdfHeader'

export {
  addFooter,
  finalizeFooters,
} from './pdf/PdfFooter'
export type { FooterOptions } from './pdf/PdfFooter'

export {
  captureChartElement,
  captureChartById,
  captureCharts,
  addChartImageToDoc,
} from './pdf/PdfCharts'
export type {
  ChartCaptureOptions,
  ChartImageOptions,
} from './pdf/PdfCharts'

export {
  addTable,
  addSimpleTable,
  addKeyValueTable,
} from './pdf/PdfTables'
export type {
  ColumnDef,
  TableOptions,
} from './pdf/PdfTables'

export {
  formatDate,
  formatShortDate,
  formatDateTime,
  formatTime,
  hexToRgb,
  truncate,
  normalizeString,
  getStatusColor,
  getStatusRgb,
  STATUS_COLORS,
} from './pdf/PdfUtils'

export { PdfReport } from './pdf/PdfReport'
export type {
  ReportOptions,
  KpiCard,
  InsightCard,
} from './pdf/PdfReport'

// ──────────────────────────────────────────────
//  EXCEL — Infrastructure
// ──────────────────────────────────────────────
export {
  EXCEL_COLORS,
  EXCEL_FONTS,
  EXCEL_HEADER_FILL,
  EXCEL_ROW_EVEN_FILL,
  EXCEL_BORDER_STYLE,
  EXCEL_BORDERS,
  EXCEL_ALIGNMENT,
  EXCEL_DEFAULTS,
  createHeaderStyle,
  createBodyStyle,
} from './excel/ExcelTheme'
export type { ExcelColumnStyle } from './excel/ExcelTheme'

export {
  addExcelTable,
  addExcelTitleRow,
  addExcelSubtitleRow,
} from './excel/ExcelTables'
export type {
  ExcelColumnDef,
  ExcelTableOptions,
} from './excel/ExcelTables'

export {
  formatDate as excelFormatDate,
  formatShortDate as excelFormatShortDate,
  formatDateTime as excelFormatDateTime,
  applyCellStyle,
  applyRowStyle,
  applyHeaderStyle,
  autoFitColumns,
} from './excel/ExcelUtils'

export { ExcelReport } from './excel/ExcelReport'
export type {
  ExcelReportOptions,
  ExcelSheetDef,
} from './excel/ExcelReport'
