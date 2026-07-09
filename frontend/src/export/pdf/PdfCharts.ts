import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { PDF_COLORS, PDF_FONTS, PDF_MARGINS } from './PdfTheme'

export interface ChartCaptureOptions {
  scale?: number
  quality?: number
  backgroundColor?: string
  useCORS?: boolean
}

export interface ChartImageOptions {
  x?: number
  y?: number
  width?: number
  maxHeight?: number
  title?: string
  align?: 'left' | 'center' | 'right'
}

const DEFAULT_CAPTURE_OPTIONS: Required<ChartCaptureOptions> = {
  scale: 2.5,
  quality: 0.92,
  backgroundColor: '#FFFFFF',
  useCORS: true,
}

export async function captureChartElement(
  element: HTMLElement,
  options?: ChartCaptureOptions,
): Promise<string | null> {
  const opts = { ...DEFAULT_CAPTURE_OPTIONS, ...options }
  try {
    const canvas = await html2canvas(element, {
      scale: opts.scale,
      useCORS: opts.useCORS,
      backgroundColor: opts.backgroundColor,
      logging: false,
      width: element.scrollWidth,
      height: element.scrollHeight,
    })
    return canvas.toDataURL('image/jpeg', opts.quality)
  } catch (e) {
    console.error('Error capturing chart element:', e)
    return null
  }
}

export async function captureChartById(
  elementId: string,
  options?: ChartCaptureOptions,
): Promise<string | null> {
  const el = document.getElementById(elementId)
  if (!el) {
    console.warn(`Chart element with id "${elementId}" not found`)
    return null
  }
  return captureChartElement(el, options)
}

export async function captureCharts(
  elementIds: string[],
  options?: ChartCaptureOptions,
): Promise<Record<string, string>> {
  const results: Record<string, string> = {}
  const entries = await Promise.all(
    elementIds.map(async (id) => {
      const dataUrl = await captureChartById(id, options)
      return [id, dataUrl] as [string, string | null]
    }),
  )
  for (const [id, dataUrl] of entries) {
    if (dataUrl) results[id] = dataUrl
  }
  return results
}

export function addChartImageToDoc(
  doc: jsPDF,
  dataUrl: string,
  options?: ChartImageOptions,
): number {
  const pw = doc.internal.pageSize.getWidth()
  const margins = PDF_MARGINS

  const maxWidth = pw - margins.left - margins.right
  const width = options?.width ?? maxWidth
  const clampedWidth = Math.min(width, maxWidth)
  const aspectRatio = 0.6
  const imgHeight = clampedWidth * aspectRatio
  const maxHeight = options?.maxHeight ?? imgHeight
  const finalHeight = Math.min(imgHeight, maxHeight)

  const title = options?.title
  let startY = options?.y ?? 0

  if (title) {
    doc.setFont(PDF_FONTS.family, 'bold')
    doc.setFontSize(10)
    doc.setTextColor(PDF_COLORS.textPrimary)
    doc.text(title, margins.left, startY + 5)
    startY += 8
  }

  const align = options?.align ?? 'center'
  let x: number
  if (align === 'center') {
    x = (pw - clampedWidth) / 2
  } else if (align === 'right') {
    x = pw - margins.right - clampedWidth
  } else {
    x = margins.left
  }

  doc.addImage(dataUrl, 'JPEG', x, startY, clampedWidth, finalHeight)
  return startY + finalHeight + 5
}
