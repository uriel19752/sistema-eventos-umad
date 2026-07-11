import { useEffect, useState, useMemo } from 'react'
import axios from 'axios'
import {
  BarChart, Bar, PieChart, Pie, Cell, Legend, LabelList,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  Star, MessageSquare, Activity, Clock, XCircle, CheckCircle,
  Layers, BarChart3, Building2, Users, SlidersHorizontal, Award,
  FileText, FileSpreadsheet, TrendingUp, Trophy, Calendar, AlertTriangle,
} from 'lucide-react'
import { COLORS } from '../theme/colors'
import SatisfaccionCalidad, { type DiagnosticoCSAT, type VariacionCSAT, type DistribucionEstrella } from '../components/SatisfaccionCalidad'
import { PdfReport, captureCharts, formatShortDate, hexToRgb, PDF_COLORS, ExcelReport, excelFormatShortDate, type ColumnDef } from '../export'

const STATUS_COLORS: Record<string, string> = {
  Pendiente: '#F59E0B',
  Aprobado: '#1E3A8A',
  Completada: '#16A34A',
  Cancelada: '#E11D48',
}

const CHART_COLORS = ['#1E3A8A', '#E11D48', '#0F172A', '#64748B', '#94A3B8', '#CBD5E1', '#F59E0B', '#16A34A']

interface DashboardData {
  totalSolicitudes: number
  pendientes: number
  aprobadas: number
  completadas: number
  canceladas: number
  porPlantel: { nombre: string; total: number }[]
  porInstitucion: { nombre: string; total: number }[]
  porMaterial: { tipo: string; total: number }[]
  porMes: { mes: string; total: number }[]
  tendencias: {
    totalSolicitudes: number
    pendientes: number
    aprobadas: number
    completadas: number
    canceladas: number
  }
  insights: {
    plantelLider: { nombre: string; porcentaje: number }
    institucionLider: { nombre: string; porcentaje: number }
    mesMasActivo: { nombre: string; total: number }
    tasaCancelacion: number
    tendenciaGeneral: {
      porcentaje: number
      tipo: 'crecimiento' | 'decrecimiento' | 'estable'
    }
  }
  promediosEncuesta?: {
    puntualidad: number
    calidadTecnica: number
    atencionStaff: number
    satisfaccionGral: number
    totalEncuestas: number
  }
  diagnostico?: DiagnosticoCSAT
  variacionCSAT?: VariacionCSAT
  distribucionEstrellas?: DistribucionEstrella[]
}

interface EncuestaCompleta {
  id: number
  solicitudId: number
  puntualidad: number
  calidadTecnica: number
  atencionStaff: number
  satisfaccionGral: number
  comentarios: string | null
  fechaRespuesta: string
  solicitud: {
    folio: string
    nombreEvento: string
    fechaEvento: string
    plantelId?: number
    institucionId?: number
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-MX', {
    year: 'numeric', month: 'short', day: 'numeric',
  })
}

function Estrellas({ rating, size }: { rating: number; size: number }) {
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          fill={s <= Math.round(rating) ? '#F59E0B' : 'transparent'}
          color={s <= Math.round(rating) ? '#F59E0B' : '#CBD5E1'}
        />
      ))}
    </div>
  )
}

function SkeletonBlock({ height }: { height: string }) {
  return <div className="skeleton" style={{ height, background: 'linear-gradient(90deg, #E2E8F0 25%, #F1F5F9 50%, #E2E8F0 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite', borderRadius: '12px' }} />
}

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', padding: '2.5rem' }}>
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>
      <div style={{ marginBottom: '2rem' }}><SkeletonBlock height="2rem" /><div style={{ height: '0.5rem' }} /><SkeletonBlock height="1rem" /></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>{[1, 2, 3, 4, 5].map((i) => <SkeletonBlock key={i} height="7rem" />)}</div>
      <div style={{ height: '1.5rem' }} /><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}><SkeletonBlock height="18rem" /><SkeletonBlock height="18rem" /></div>
    </div>
  )
}

export default function EstadisticasView({ onCambioInstitucion }: { onCambioInstitucion?: (inst: 'umad' | 'prepa' | 'imm' | 'sistema') => void }) {
  const [loading, setLoading] = useState(true)
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [encuestas, setEncuestas] = useState<EncuestaCompleta[]>([])
  const [selectedEncuestaId, setSelectedEncuestaId] = useState<number | 'todas'>('todas')
  const [error, setError] = useState<string | null>(null)

  const [exportandoPDF, setExportandoPDF] = useState(false)
  const [exportandoExcel, setExportandoExcel] = useState(false)

  // Estados de filtro de rango de fechas
  const [rangoFechas, setRangoFechas] = useState<string>('todo')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')

  function aplicarRango(preset: string): { inicio: string; fin: string } | null {
    const hoy = new Date()
    switch (preset) {
      case 'todo': return null
      case '30d': {
        const fin = new Date(hoy)
        const inicio = new Date(hoy)
        inicio.setDate(inicio.getDate() - 30)
        return { inicio: inicio.toISOString().split('T')[0], fin: fin.toISOString().split('T')[0] }
      }
      case '3m': {
        const fin = new Date(hoy)
        const inicio = new Date(hoy)
        inicio.setMonth(inicio.getMonth() - 3)
        return { inicio: inicio.toISOString().split('T')[0], fin: fin.toISOString().split('T')[0] }
      }
      case '6m': {
        const fin = new Date(hoy)
        const inicio = new Date(hoy)
        inicio.setMonth(inicio.getMonth() - 6)
        return { inicio: inicio.toISOString().split('T')[0], fin: fin.toISOString().split('T')[0] }
      }
      case 'anio': {
        return { inicio: `${hoy.getFullYear()}-01-01`, fin: `${hoy.getFullYear()}-12-31` }
      }
      default: return null
    }
  }

  function manejarCambioRango(preset: string) {
    setRangoFechas(preset)
    if (preset !== 'personalizado') {
      const rango = aplicarRango(preset)
      setFechaInicio(rango?.inicio ?? '')
      setFechaFin(rango?.fin ?? '')
    }
  }

  /**
   * Detona la descarga de un archivo PDF o Excel con los datos actuales del
   * dashboard, mapeando los estados de los filtros dinámicos a query params.
   *
   * Mapeo de filtros → URLSearchParams:
   *
   *   Los filtros activos en el estado del componente se traducen uno a uno
   *   a parámetros de consulta HTTP:
   *
   *     Estado React                   Query param
   *     ─────────────────────────────────────────────────
   *     plantelFiltro !== 'todos'  →   `?plantel={nombre}`
   *     institucionFiltro !== 'todos'→ `?institucion={nombre}`
   *     fechaInicio (string)       →   `?fechaInicio={YYYY-MM-DD}`
   *     fechaFin (string)          →   `?fechaFin={YYYY-MM-DD}`
   *
   *   Los filtros con valor `'todos'` se omiten para no enviar parámetros
   *   redundantes al backend. El objeto `params` se pasa directamente a
   *   `axios.get(..., { params })`, que serializa a query string.
   *
   * Flujo binario de descarga:
   *
   *   1. El endpoint retorna un `Blob` binario (PDF o XLSX) con
   *      `responseType: 'blob'` para que Axios no intente parsear JSON.
   *   2. Se crea una URL efímera con `window.URL.createObjectURL(blob)`.
   *   3. Se inserta un `<a>` invisible en el DOM con `href = {url}` y
   *      `download = {nombre archivo}`, y se dispara un clic programático.
   *   4. Se remueve el `<a>` y se libera la URL con `revokeObjectURL()`.
   *
   *   Este patrón evita abrir el binario en una pestaña nueva y funciona
   *   en todos los navegadores modernos.
   *
   * Enrutamiento:
   *   La función delega en cuatro handlers específicos según el tipo de
   *   reporte y la sub-pestaña activa, para mantener la lógica de
   *   generación del archivo separada:
   *   - `handleExportPDF()`             — PDF operativo (logística)
   *   - `handleExportPDF_Satisfaccion()` — PDF calidad (satisfacción)
   *   - `handleExportExcel()`            — Excel operativo
   *   - `handleExportExcel_Satisfaccion()`— Excel calidad
   *
   * @param tipo - Formato de exportación: `'pdf'` o `'excel'`.
   *
   * @returns {Promise<void>}
   */
  const handleExport = async (tipo: 'pdf' | 'excel') => {
    if (tipo === 'pdf' && subTab !== 'satisfacion') {
      await handleExportPDF()
      return
    }
    if (tipo === 'pdf' && subTab === 'satisfacion') {
      await handleExportPDF_Satisfaccion()
      return
    }
    if (tipo === 'excel' && subTab !== 'satisfacion') {
      await handleExportExcel()
      return
    }
    if (tipo === 'excel' && subTab === 'satisfacion') {
      await handleExportExcel_Satisfaccion()
      return
    }
    const setter = tipo === 'pdf' ? setExportandoPDF : setExportandoExcel
    setter(true)
    try {
      const params: Record<string, string> = {}
      if (plantelFiltro !== 'todos') params.plantel = plantelFiltro
      if (institucionFiltro !== 'todos') params.institucion = institucionFiltro
      if (fechaInicio) params.fechaInicio = fechaInicio
      if (fechaFin) params.fechaFin = fechaFin

      const endpoint = subTab === 'satisfacion'
        ? `/api/reportes/satisfaccion/${tipo}`
        : `/api/estadisticas/export/${tipo}`

      const res = await axios.get(endpoint, {
        params,
        responseType: 'blob',
      })

      const suffix = subTab === 'satisfacion' ? 'Calidad' : 'Operativo'
      const extension = tipo === 'pdf' ? 'pdf' : 'xlsx'
      const blob = new Blob([res.data], {
        type:
          tipo === 'pdf'
            ? 'application/pdf'
            : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `TigreTrack_Reporte_${suffix}.${extension}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (e) {
      console.error(`Error al exportar ${tipo.toUpperCase()}:`, e)
    } finally {
      setter(false)
    }
  }

  async function handleExportPDF() {
    if (!dashboard) return
    setExportandoPDF(true)
    try {
      const getPeriodo = () => {
        if (rangoFechas === 'todo') return 'Todo el histórico'
        if (rangoFechas === '30d') return 'Últimos 30 días'
        if (rangoFechas === '3m') return 'Últimos 3 meses'
        if (rangoFechas === '6m') return 'Últimos 6 meses'
        if (rangoFechas === 'anio') return `Año ${new Date().getFullYear()}`
        if (rangoFechas === 'personalizado') {
          if (fechaInicio && fechaFin) return `${fechaInicio} — ${fechaFin}`
          if (fechaInicio) return `Desde ${fechaInicio}`
          if (fechaFin) return `Hasta ${fechaFin}`
        }
        return 'Período no especificado'
      }

      const plantelNombre = plantelFiltro === 'todos' ? 'Todos los Planteles' : plantelFiltro
      const instNombre = institucionFiltro === 'todos' ? 'Todas las Instituciones' : institucionFiltro

      // Fetch solicitudes for detail table
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let solicitudesPDF: Array<Record<string, any>> = []
      try {
        const res = await axios.get('/api/solicitudes')
        solicitudesPDF = res.data ?? []
        if (plantelFiltro !== 'todos') solicitudesPDF = solicitudesPDF.filter((item) => item.plantel?.nombre === plantelFiltro)
        if (institucionFiltro !== 'todos') solicitudesPDF = solicitudesPDF.filter((item) => item.institucion?.nombre === institucionFiltro)
        if (fechaInicio) {
          const startDate = new Date(fechaInicio)
          solicitudesPDF = solicitudesPDF.filter((item) => {
            const d = item.fechaSolicitud ? new Date(item.fechaSolicitud) : (item.fechaEvento ? new Date(item.fechaEvento) : null)
            return d && d >= startDate
          })
        }
        if (fechaFin) {
          const endDate = new Date(fechaFin + 'T23:59:59')
          solicitudesPDF = solicitudesPDF.filter((item) => {
            const d = item.fechaSolicitud ? new Date(item.fechaSolicitud) : (item.fechaEvento ? new Date(item.fechaEvento) : null)
            return d && d <= endDate
          })
        }
        solicitudesPDF.sort((a, b) => {
          const da = a.fechaSolicitud ? new Date(a.fechaSolicitud).getTime() : (a.fechaEvento ? new Date(a.fechaEvento).getTime() : 0)
          const db = b.fechaSolicitud ? new Date(b.fechaSolicitud).getTime() : (b.fechaEvento ? new Date(b.fechaEvento).getTime() : 0)
          return db - da
        })
      } catch (err) {
        console.error('Error fetching solicitudes for PDF:', err)
      }

      // Capture charts via PdfCharts utility
      const chartIds = ['chart-mensual', 'chart-estado', 'chart-macro', 'chart-servicios', 'chart-plantel', 'chart-institucion']
      const chartDataUrls = await captureCharts(chartIds, { scale: 2.5, quality: 0.92 })

      const resumen = generarResumen()

      const kpiData = [
        { label: 'Total Solicitudes', value: dashboard.totalSolicitudes, color: '#1E3A8A', bg: '#EEF2FF' },
        { label: 'Pendientes', value: dashboard.pendientes, color: '#F59E0B', bg: '#FFFBEB' },
        { label: 'Aprobadas', value: dashboard.aprobadas, color: '#1E3A8A', bg: '#EEF2FF' },
        { label: 'Completadas', value: dashboard.completadas, color: '#16A34A', bg: '#F0FDF4' },
        { label: 'Canceladas', value: dashboard.canceladas, color: '#E11D48', bg: '#FFF1F2' },
      ]

      const ins = dashboard.insights
      const insightData = [
        { label: 'Tendencia General', value: ins.tendenciaGeneral?.tipo === 'crecimiento' ? `+${ins.tendenciaGeneral?.porcentaje ?? 0}%` : ins.tendenciaGeneral?.tipo === 'decrecimiento' ? `${ins.tendenciaGeneral?.porcentaje ?? 0}%` : 'Estable', desc: ins.tendenciaGeneral?.tipo === 'crecimiento' ? `Incremento del ${(ins.tendenciaGeneral?.porcentaje ?? 0)}%` : ins.tendenciaGeneral?.tipo === 'decrecimiento' ? `Decremento del ${Math.abs(Number(ins.tendenciaGeneral?.porcentaje) || 0)}%` : 'Sin cambios significativos', color: ins.tendenciaGeneral?.tipo === 'crecimiento' ? '#16A34A' : ins.tendenciaGeneral?.tipo === 'decrecimiento' ? '#E11D48' : '#64748B' },
        { label: 'Plantel Líder', value: ins.plantelLider?.nombre ?? 'N/D', desc: `${ins.plantelLider?.porcentaje ?? 0}% de las solicitudes`, color: '#1E3A8A' },
        { label: 'Institución Líder', value: ins.institucionLider?.nombre ?? 'N/D', desc: `${ins.institucionLider?.porcentaje ?? 0}% de las solicitudes`, color: '#16A34A' },
        { label: 'Mes Más Activo', value: ins.mesMasActivo?.nombre ?? 'N/D', desc: `${ins.mesMasActivo?.total ?? 0} solicitudes`, color: '#F59E0B' },
        { label: 'Tasa de Cancelación', value: `${ins.tasaCancelacion ?? 0}%`, desc: 'del total de solicitudes', color: '#E11D48' },
      ]

      const report = new PdfReport({ title: 'Reporte de Estadísticas Operativas' })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc = (report as any).doc as import('jspdf').default
      const pw = doc.internal.pageSize.getWidth()
      const ph = doc.internal.pageSize.getHeight()

      // ═══════════════════ COVER PAGE ═══════════════════
      const [cr, cg, cb] = hexToRgb(PDF_COLORS.coverBg1)
      doc.setFillColor(cr, cg, cb)
      doc.rect(0, 0, pw, ph, 'F')

      doc.setFillColor(225, 29, 72)
      doc.rect(40, 130, 80, 4, 'F')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(160, 175, 210)
      doc.text('TIGRETRACK INTELLIGENCE', pw / 2, 105, { align: 'center' })

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(34)
      doc.setTextColor(255, 255, 255)
      doc.text('Reporte Ejecutivo', pw / 2, 175, { align: 'center' })
      doc.text('de Estadísticas', pw / 2, 205, { align: 'center' })

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(13)
      doc.setTextColor(180, 195, 225)
      doc.text('Panel Logístico y Operativo', pw / 2, 235, { align: 'center' })

      const metaY = 280
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(200, 210, 235)
      doc.text('PERÍODO', pw / 2 - 120, metaY)
      doc.text('PLANTEL', pw / 2 - 120, metaY + 14)
      doc.text('INSTITUCIÓN', pw / 2 - 120, metaY + 28)
      doc.text('GENERACIÓN', pw / 2 - 120, metaY + 42)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(255, 255, 255)
      const genDateStr = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
      const genTimeStr = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
      doc.text(getPeriodo(), pw / 2 + 20, metaY)
      doc.text(plantelNombre, pw / 2 + 20, metaY + 14)
      doc.text(instNombre, pw / 2 + 20, metaY + 28)
      doc.text(`${genDateStr} — ${genTimeStr}`, pw / 2 + 20, metaY + 42)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(160, 175, 210)
      doc.text('Universidad Madero (UMAD) · Sistema TigreTrack', pw / 2, ph - 22, { align: 'center' })

      // ═══════════════════ EXECUTIVE SUMMARY + KPIs ═══════════════════
      report.addPage()
      report.addSectionTitle('Resumen Ejecutivo')
      report.addBodyText(resumen)
      report.addSectionTitle('Indicadores Clave de Desempeño (KPIs)')
      report.addKpiCards(kpiData)

      // ═══════════════════ INSIGHTS PAGE ═══════════════════
      report.addPage()
      report.addSectionTitle('Insights Estratégicos')
      report.addInsightCards(insightData)

      // ═══════════════════ CHARTS (3 pages, 2 per page) ═══════════════════
      const chartPairs: Array<[string, string, string, string]> = [
        ['chart-macro', 'Distribución por Categoría Macro', 'chart-servicios', 'Servicios de Cobertura más Demandados'],
        ['chart-plantel', 'Distribución Física por Plantel', 'chart-institucion', 'Distribución Académica por Institución'],
        ['chart-mensual', 'Solicitudes por Historial Mensual', 'chart-estado', 'Distribución Operativa por Estado'],
      ]

      for (const [id1, title1, id2, title2] of chartPairs) {
        report.addPage()
        if (chartDataUrls[id1]) {
          report.addChartImage(chartDataUrls[id1], { title: title1, width: 170 })
        }
        if (chartDataUrls[id2]) {
          report.addChartImage(chartDataUrls[id2], { title: title2, width: 170 })
        }
      }

      // ═══════════════════ SOLICITUDES TABLE ═══════════════════
      if (solicitudesPDF.length > 0) {
        report.addPage()
        report.addSectionTitle('Detalle de Solicitudes')
        const columns: ColumnDef[] = [
          { header: 'Folio', dataKey: 'folio', width: 30, style: { fontStyle: 'bold' } },
          { header: 'Evento', dataKey: 'nombreEvento' },
          { header: 'Plantel', dataKey: 'plantelNombre' },
          { header: 'Institución', dataKey: 'institucionNombre' },
          { header: 'Estado', dataKey: 'estado', align: 'center' },
          { header: 'Fecha', dataKey: 'fecha', align: 'center' },
        ]
        const tableData = solicitudesPDF.map((item) => ({
          folio: item.folio ?? '—',
          nombreEvento: item.nombreEvento ?? '—',
          plantelNombre: item.plantel?.nombre ?? '—',
          institucionNombre: item.institucion?.nombre ?? item.institucionPersonalizada ?? '—',
          estado: item.estado,
          fecha: item.fechaSolicitud ? formatShortDate(item.fechaSolicitud) : item.fechaEvento ? formatShortDate(item.fechaEvento) : '—',
        }))
        report.addTable(columns, tableData)
      }

      report.save('TigreTrack_Reporte_Operativo.pdf')
    } catch (e) {
      console.error('Error generando PDF:', e)
    } finally {
      setExportandoPDF(false)
    }
  }

  async function handleExportExcel() {
    if (!dashboard) return
    setExportandoExcel(true)
    try {
      const getPeriodo = () => {
        if (rangoFechas === 'todo') return 'Todo el histórico'
        if (rangoFechas === '30d') return 'Últimos 30 días'
        if (rangoFechas === '3m') return 'Últimos 3 meses'
        if (rangoFechas === '6m') return 'Últimos 6 meses'
        if (rangoFechas === 'anio') return `Año ${new Date().getFullYear()}`
        if (rangoFechas === 'personalizado') {
          if (fechaInicio && fechaFin) return `${fechaInicio} — ${fechaFin}`
          if (fechaInicio) return `Desde ${fechaInicio}`
          if (fechaFin) return `Hasta ${fechaFin}`
        }
        return 'Período no especificado'
      }

      const plantelNombre = plantelFiltro === 'todos' ? 'Todos los Planteles' : plantelFiltro
      const instNombre = institucionFiltro === 'todos' ? 'Todas las Instituciones' : institucionFiltro

      // Capture chart images for Excel
      const chartIds = ['chart-mensual', 'chart-estado', 'chart-macro', 'chart-servicios', 'chart-plantel', 'chart-institucion']
      const chartImages = await captureCharts(chartIds, { scale: 2.5, quality: 0.92 })

      // Fetch solicitudes for detail sheet
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let solicitudesExcel: Array<Record<string, any>> = []
      try {
        const res = await axios.get('/api/solicitudes')
        solicitudesExcel = res.data ?? []
        if (plantelFiltro !== 'todos') solicitudesExcel = solicitudesExcel.filter((item) => item.plantel?.nombre === plantelFiltro)
        if (institucionFiltro !== 'todos') solicitudesExcel = solicitudesExcel.filter((item) => item.institucion?.nombre === institucionFiltro)
        if (fechaInicio) {
          const startDate = new Date(fechaInicio)
          solicitudesExcel = solicitudesExcel.filter((item) => {
            const d = item.fechaSolicitud ? new Date(item.fechaSolicitud) : (item.fechaEvento ? new Date(item.fechaEvento) : null)
            return d && d >= startDate
          })
        }
        if (fechaFin) {
          const endDate = new Date(fechaFin + 'T23:59:59')
          solicitudesExcel = solicitudesExcel.filter((item) => {
            const d = item.fechaSolicitud ? new Date(item.fechaSolicitud) : (item.fechaEvento ? new Date(item.fechaEvento) : null)
            return d && d <= endDate
          })
        }
        solicitudesExcel.sort((a, b) => {
          const da = a.fechaSolicitud ? new Date(a.fechaSolicitud).getTime() : (a.fechaEvento ? new Date(a.fechaEvento).getTime() : 0)
          const db = b.fechaSolicitud ? new Date(b.fechaSolicitud).getTime() : (b.fechaEvento ? new Date(b.fechaEvento).getTime() : 0)
          return db - da
        })
      } catch (err) {
        console.error('Error fetching solicitudes for Excel:', err)
      }

      const book = new ExcelReport({ title: 'Reporte Estadístico TigreTrack' })
      const periodo = getPeriodo()
      const totalSolicitudes = dashboard.totalSolicitudes || 1

      // ── Sheet 1: Resumen / KPIs ──
      const kpiEntries = [
        { label: 'Total Solicitudes', value: dashboard.totalSolicitudes },
        { label: 'Pendientes', value: dashboard.pendientes },
        { label: 'Aprobadas', value: dashboard.aprobadas },
        { label: 'Completadas', value: dashboard.completadas },
        { label: 'Canceladas', value: dashboard.canceladas },
      ]
      book.addDashboardSheet('Resumen - KPIs', 'Reporte de Estadísticas Operativas', kpiEntries)

      // ── Sheet 2: Planteles ──
      const plantelData = (dashboard.porPlantel ?? []).map((p) => ({
        plantel: p.nombre ?? '—',
        total: p.total ?? 0,
        porcentaje: `${((p.total / totalSolicitudes) * 100).toFixed(1)}%`,
      }))
      const plantelSheet = book.addFullSheet({
        name: 'Planteles',
        title: 'Distribución por Plantel',
        subtitle: `Período: ${periodo}`,
        columns: [
          { header: 'Plantel', dataKey: 'plantel', width: 35 },
          { header: 'Total Solicitudes', dataKey: 'total', width: 22, align: 'center' },
          { header: 'Porcentaje', dataKey: 'porcentaje', width: 16, align: 'center' },
        ],
        data: plantelData,
      })
      if (plantelSheet.rowCount >= 4) {
        plantelSheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: plantelSheet.rowCount, column: 3 } }
      }

      // ── Sheet 3: Instituciones ──
      const instData = (dashboard.porInstitucion ?? []).map((i) => ({
        institucion: i.nombre ?? '—',
        total: i.total ?? 0,
        porcentaje: `${((i.total / totalSolicitudes) * 100).toFixed(1)}%`,
      }))
      const instSheet = book.addFullSheet({
        name: 'Instituciones',
        title: 'Distribución por Institución',
        subtitle: `Período: ${periodo}`,
        columns: [
          { header: 'Institución', dataKey: 'institucion', width: 35 },
          { header: 'Total Solicitudes', dataKey: 'total', width: 22, align: 'center' },
          { header: 'Porcentaje', dataKey: 'porcentaje', width: 16, align: 'center' },
        ],
        data: instData,
      })
      if (instSheet.rowCount >= 4) {
        instSheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: instSheet.rowCount, column: 3 } }
      }

      // ── Sheet 4: Histórico / Solicitudes ──
      if (solicitudesExcel.length > 0) {
        const solicitudesData = solicitudesExcel.map((item) => ({
          folio: item.folio ?? '—',
          evento: item.nombreEvento ?? '—',
          plantel: item.plantel?.nombre ?? '—',
          institucion: item.institucion?.nombre ?? item.institucionPersonalizada ?? '—',
          estado: item.estado,
          fecha: item.fechaSolicitud
            ? excelFormatShortDate(item.fechaSolicitud)
            : item.fechaEvento
              ? excelFormatShortDate(item.fechaEvento)
              : '—',
        }))
        const solicitudesSheet = book.addFullSheet({
          name: 'Histórico - Solicitudes',
          title: 'Detalle de Solicitudes',
          subtitle: `${periodo} | ${plantelNombre} | ${instNombre}`,
          columns: [
            { header: 'Folio', dataKey: 'folio', width: 18 },
            { header: 'Nombre del Evento', dataKey: 'evento', width: 38 },
            { header: 'Plantel', dataKey: 'plantel', width: 26 },
            { header: 'Institución', dataKey: 'institucion', width: 28 },
            { header: 'Estado', dataKey: 'estado', width: 16, align: 'center' },
            { header: 'Fecha', dataKey: 'fecha', width: 16, align: 'center' },
          ],
          data: solicitudesData,
        })
        if (solicitudesSheet.rowCount >= 4) {
          solicitudesSheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: solicitudesSheet.rowCount, column: 6 } }
        }
      }

      // ── Inject chart images into Resumen - KPIs sheet ──
      const chartConfigs = [
        { id: 'chart-mensual', title: 'Solicitudes por Mes' },
        { id: 'chart-estado', title: 'Distribución por Estado' },
        { id: 'chart-macro', title: 'Distribución por Categoría Macro' },
        { id: 'chart-servicios', title: 'Servicios más Demandados' },
        { id: 'chart-plantel', title: 'Distribución por Plantel' },
        { id: 'chart-institucion', title: 'Distribución por Institución' },
      ]
      const kpiSheet = book.getSheet('Resumen - KPIs')
      if (kpiSheet && Object.keys(chartImages).length > 0) {
        const chartWidth = 580
        const chartHeight = 320
        // addImage uses 0-indexed column/row for tl
        let baseRow = 12
        const baseCol = 0

        for (let i = 0; i < chartConfigs.length; i += 2) {
          const c1 = chartConfigs[i]
          const img1 = chartImages[c1.id]
          if (img1) {
            book.addImageToSheet('Resumen - KPIs', img1, { col: baseCol, row: baseRow }, { width: chartWidth, height: chartHeight })
          }

          const c2 = chartConfigs[i + 1]
          const img2 = c2 ? chartImages[c2.id] : undefined
          if (img2) {
            book.addImageToSheet('Resumen - KPIs', img2, { col: baseCol + 6, row: baseRow }, { width: chartWidth, height: chartHeight })
          }

          baseRow += 18
        }
      }

      await book.save('TigreTrack_Reporte_Operativo.xlsx')
    } catch (e) {
      console.error('Error generando Excel:', e)
    } finally {
      setExportandoExcel(false)
    }
  }

  async function handleExportPDF_Satisfaccion() {
    if (!dashboard) return
    setExportandoPDF(true)
    try {
      const isAll = selectedEncuestaId === 'todas'
      const promedios = isAll ? dashboard.promediosEncuesta! : datosCSAT!.promedios
      const diagnostico = isAll ? (dashboard.diagnostico ?? null) : datosCSAT!.diagnostico
      const distribucion = isAll ? (dashboard.distribucionEstrellas ?? []) : datosCSAT!.distribucion
      const respuestas = isAll ? encuestas : encuestasFiltradas
      const comentariosList = comentarios

      if (!promedios || promedios.totalEncuestas === 0) {
        console.warn('No hay datos de satisfacción para exportar')
        return
      }

      const getPeriodo = () => {
        if (rangoFechas === 'todo') return 'Todo el histórico'
        if (rangoFechas === '30d') return 'Últimos 30 días'
        if (rangoFechas === '3m') return 'Últimos 3 meses'
        if (rangoFechas === '6m') return 'Últimos 6 meses'
        if (rangoFechas === 'anio') return `Año ${new Date().getFullYear()}`
        if (rangoFechas === 'personalizado') {
          if (fechaInicio && fechaFin) return `${fechaInicio} — ${fechaFin}`
          if (fechaInicio) return `Desde ${fechaInicio}`
          if (fechaFin) return `Hasta ${fechaFin}`
        }
        return 'Período no especificado'
      }

      const plantelNombre = plantelFiltro === 'todos' ? 'Todos los Planteles' : plantelFiltro
      const instNombre = institucionFiltro === 'todos' ? 'Todas las Instituciones' : institucionFiltro
      const encuestaTexto = isAll ? 'Todas las encuestas (Consolidado)' : `Encuesta #${selectedEncuestaId}`

      // Capture the CSAT metrics section from DOM
      const chartImages = await captureCharts(['csat-section'], { scale: 2.5, quality: 0.92 })

      const report = new PdfReport({ title: 'Reporte de Satisfacción y Calidad' })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const doc = (report as any).doc as import('jspdf').default
      const pw = doc.internal.pageSize.getWidth()
      const ph = doc.internal.pageSize.getHeight()
      const [cr, cg, cb] = hexToRgb(PDF_COLORS.coverBg1)

      // ═══════════════════ COVER PAGE ═══════════════════
      doc.setFillColor(cr, cg, cb)
      doc.rect(0, 0, pw, ph, 'F')

      doc.setFillColor(234, 179, 8)
      doc.rect(40, 130, 80, 4, 'F')

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(11)
      doc.setTextColor(160, 175, 210)
      doc.text('TIGRETRACK INTELLIGENCE', pw / 2, 105, { align: 'center' })

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(30)
      doc.setTextColor(255, 255, 255)
      doc.text('Reporte de Satisfacción', pw / 2, 170, { align: 'center' })
      doc.text('y Calidad', pw / 2, 200, { align: 'center' })

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(13)
      doc.setTextColor(180, 195, 225)
      doc.text('Panel de Evaluación Institucional', pw / 2, 235, { align: 'center' })

      // Meta info
      const metaY = 280
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(200, 210, 235)
      doc.text('PERÍODO', pw / 2 - 120, metaY)
      doc.text('ENCUESTA', pw / 2 - 120, metaY + 14)
      doc.text('PLANTEL', pw / 2 - 120, metaY + 28)
      doc.text('INSTITUCIÓN', pw / 2 - 120, metaY + 42)
      doc.text('GENERACIÓN', pw / 2 - 120, metaY + 56)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(255, 255, 255)
      const genDateStr = new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
      const genTimeStr = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
      doc.text(getPeriodo(), pw / 2 + 20, metaY)
      doc.text(encuestaTexto, pw / 2 + 20, metaY + 14)
      doc.text(plantelNombre, pw / 2 + 20, metaY + 28)
      doc.text(instNombre, pw / 2 + 20, metaY + 42)
      doc.text(`${genDateStr} — ${genTimeStr}`, pw / 2 + 20, metaY + 56)

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(160, 175, 210)
      doc.text('Universidad Madero (UMAD) · Sistema TigreTrack', pw / 2, ph - 22, { align: 'center' })

      // ═══════════════════ DIAGNÓSTICO Y PROMEDIOS ═══════════════════
      report.addPage()
      report.addSectionTitle('Diagnóstico y Promedios de Indicadores')

      if (diagnostico) {
        report.addInsightCards([{
          label: 'Diagnóstico CSAT',
          value: diagnostico.nivel,
          desc: diagnostico.mensaje,
          color: diagnostico.color,
        }])
      }

      const criteriaCards = [
        { label: 'Puntualidad', value: Number(promedios.puntualidad.toFixed(1)), color: '#2563EB' },
        { label: 'Calidad Técnica', value: Number(promedios.calidadTecnica.toFixed(1)), color: '#7C3AED' },
        { label: 'Atención Staff', value: Number(promedios.atencionStaff.toFixed(1)), color: '#F59E0B' },
        { label: 'Satisfacción Gral.', value: Number(promedios.satisfaccionGral.toFixed(1)), color: '#16A34A' },
      ]
      report.addSubsectionTitle(`${promedios.totalEncuestas} encuesta(s) respondida(s)`)
      report.addKpiCards(criteriaCards)

      // ═══════════════════ CAPTURED CSAT VISUAL PANEL ═══════════════════
      if (chartImages['csat-section']) {
        report.addPage()
        report.addSectionTitle('Panel Visual de Satisfacción')
        report.addChartImage(chartImages['csat-section'], {
          title: 'Métricas Detalladas, Diagnóstico y Distribución de Evaluaciones',
          width: 170,
        })
      }

      // ═══════════════════ DISTRIBUCIÓN DE ESTRELLAS ═══════════════════
      if (distribucion.length > 0) {
        report.addPage()
        report.addSectionTitle('Distribución de Calificaciones')
        const totalEnc = distribucion.reduce((s: number, d: DistribucionEstrella) => s + d.total, 0)
        const starColumns: ColumnDef[] = [
          { header: 'Estrellas', dataKey: 'estrellas', width: 50 },
          { header: 'Respuestas', dataKey: 'total', width: 35, align: 'center' },
          { header: '% del Total', dataKey: 'porcentaje', width: 35, align: 'center' },
        ]
        const starData = distribucion.map((d: DistribucionEstrella) => ({
          estrellas: `${'★'.repeat(d.estrellas)}${'☆'.repeat(5 - d.estrellas)}`,
          total: d.total,
          porcentaje: totalEnc > 0 ? `${((d.total / totalEnc) * 100).toFixed(1)}%` : '0%',
        }))
        report.addTable(starColumns, starData)
      }

      // ═══════════════════ COMENTARIOS ═══════════════════
      if (comentariosList.length > 0) {
        report.addPage()
        report.addSectionTitle('Comentarios y Retroalimentación')
        for (const c of comentariosList) {
          const solicitud = c.solicitud ?? ({} as EncuestaCompleta['solicitud'])
          report.addBodyText(`${solicitud.nombreEvento ?? 'Evento'} — Folio: ${solicitud.folio ?? 'N/A'}`, {
            fontSize: 9,
            bold: true,
            color: '#1E3A8A',
          })
          report.addBodyText(`"${c.comentarios ?? ''}"`, {
            fontSize: 9,
            color: '#334155',
          })
          report.addSeparator()
        }
      }

      // ═══════════════════ TABLA DE RESPUESTAS DETALLADAS ═══════════════════
      if (respuestas.length > 0) {
        report.addPage()
        report.addSectionTitle('Detalle de Respuestas de Encuestas')
        const encColumns: ColumnDef[] = [
          { header: 'Folio', dataKey: 'folio', width: 22 },
          { header: 'Evento', dataKey: 'evento', width: 38 },
          { header: 'Puntualidad', dataKey: 'puntualidad', width: 22, align: 'center' },
          { header: 'Calidad Téc.', dataKey: 'calidadTecnica', width: 22, align: 'center' },
          { header: 'Atención', dataKey: 'atencionStaff', width: 22, align: 'center' },
          { header: 'Satisf. Gral', dataKey: 'satisfaccionGral', width: 22, align: 'center' },
          { header: 'Fecha', dataKey: 'fecha', width: 22, align: 'center' },
        ]
        const encData = respuestas.map((e: EncuestaCompleta) => ({
          folio: e.solicitud?.folio ?? '—',
          evento: e.solicitud?.nombreEvento ?? '—',
          puntualidad: e.puntualidad,
          calidadTecnica: e.calidadTecnica,
          atencionStaff: e.atencionStaff,
          satisfaccionGral: e.satisfaccionGral,
          fecha: formatShortDate(e.fechaRespuesta),
        }))
        report.addTable(encColumns, encData)
      }

      report.save('TigreTrack_Reporte_Satisfaccion.pdf')
    } catch (e) {
      console.error('Error generando PDF de Satisfacción:', e)
    } finally {
      setExportandoPDF(false)
    }
  }

  async function handleExportExcel_Satisfaccion() {
    if (!dashboard) return
    setExportandoExcel(true)
    try {
      const isAll = selectedEncuestaId === 'todas'
      const promedios = isAll ? dashboard.promediosEncuesta! : datosCSAT!.promedios
      const diagnostico = isAll ? (dashboard.diagnostico ?? null) : datosCSAT!.diagnostico
      const distribucion = isAll ? (dashboard.distribucionEstrellas ?? []) : datosCSAT!.distribucion
      const respuestas = isAll ? encuestas : encuestasFiltradas
      const comentariosList = comentarios

      if (!promedios || promedios.totalEncuestas === 0) {
        console.warn('No hay datos de satisfacción para exportar')
        return
      }

      const getPeriodo = () => {
        if (rangoFechas === 'todo') return 'Todo el histórico'
        if (rangoFechas === '30d') return 'Últimos 30 días'
        if (rangoFechas === '3m') return 'Últimos 3 meses'
        if (rangoFechas === '6m') return 'Últimos 6 meses'
        if (rangoFechas === 'anio') return `Año ${new Date().getFullYear()}`
        if (rangoFechas === 'personalizado') {
          if (fechaInicio && fechaFin) return `${fechaInicio} — ${fechaFin}`
          if (fechaInicio) return `Desde ${fechaInicio}`
          if (fechaFin) return `Hasta ${fechaFin}`
        }
        return 'Período no especificado'
      }

      const periodo = getPeriodo()
      const plantelNombre = plantelFiltro === 'todos' ? 'Todos los Planteles' : plantelFiltro
      const instNombre = institucionFiltro === 'todos' ? 'Todas las Instituciones' : institucionFiltro
      const encuestaTexto = isAll ? 'Todas las encuestas (Consolidado)' : `Encuesta #${selectedEncuestaId}`
      const subtitleMeta = `${periodo} | ${plantelNombre} | ${instNombre} | ${encuestaTexto}`

      const book = new ExcelReport({ title: 'Reporte de Satisfacción de Usuarios TigreTrack' })
      const globalAvg = (promedios.puntualidad + promedios.calidadTecnica + promedios.atencionStaff + promedios.satisfaccionGral) / 4

      // ── Sheet 1: Resumen ──
      const resumenSheet = book.addFullSheet({
        name: 'Resumen',
        title: 'Reporte de Satisfacción de Usuarios TigreTrack',
        subtitle: subtitleMeta,
        columns: [
          { header: 'Métrica', dataKey: 'metrica', width: 40 },
          { header: 'Valor', dataKey: 'valor', width: 25, align: 'center' },
        ],
        data: [
          { metrica: 'Total Encuestas Respondidas', valor: promedios.totalEncuestas },
          { metrica: 'Promedio Global de Satisfacción', valor: `${globalAvg.toFixed(2)} / 5` },
          { metrica: 'Puntualidad', valor: `${promedios.puntualidad.toFixed(1)} / 5` },
          { metrica: 'Calidad Técnica', valor: `${promedios.calidadTecnica.toFixed(1)} / 5` },
          { metrica: 'Atención del Staff', valor: `${promedios.atencionStaff.toFixed(1)} / 5` },
          { metrica: 'Satisfacción General', valor: `${promedios.satisfaccionGral.toFixed(1)} / 5` },
          { metrica: 'Diagnóstico', valor: diagnostico?.nivel ?? 'N/D' },
        ],
      })
      if (resumenSheet.rowCount >= 4) {
        resumenSheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: resumenSheet.rowCount, column: 2 } }
      }

      // ── Sheet 2: Indicadores ──
      const indicators = [
        { criterio: 'Puntualidad', promedio: promedios.puntualidad.toFixed(1), porcentaje: `${((promedios.puntualidad / 5) * 100).toFixed(0)}%` },
        { criterio: 'Calidad Técnica', promedio: promedios.calidadTecnica.toFixed(1), porcentaje: `${((promedios.calidadTecnica / 5) * 100).toFixed(0)}%` },
        { criterio: 'Atención del Staff', promedio: promedios.atencionStaff.toFixed(1), porcentaje: `${((promedios.atencionStaff / 5) * 100).toFixed(0)}%` },
        { criterio: 'Satisfacción General', promedio: promedios.satisfaccionGral.toFixed(1), porcentaje: `${((promedios.satisfaccionGral / 5) * 100).toFixed(0)}%` },
        { criterio: 'Promedio Global', promedio: globalAvg.toFixed(2), porcentaje: `${((globalAvg / 5) * 100).toFixed(0)}%` },
      ]
      const indicadoresSheet = book.addFullSheet({
        name: 'Indicadores',
        title: 'Promedios de Satisfacción por Criterio',
        subtitle: periodo,
        columns: [
          { header: 'Criterio', dataKey: 'criterio', width: 35 },
          { header: 'Promedio (/5)', dataKey: 'promedio', width: 20, align: 'center' },
          { header: 'Porcentaje', dataKey: 'porcentaje', width: 18, align: 'center' },
        ],
        data: indicators,
      })
      if (indicadoresSheet.rowCount >= 4) {
        indicadoresSheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: indicadoresSheet.rowCount, column: 3 } }
      }

      // ── Sheet 3: Distribución ──
      const totalDist = distribucion.reduce((s: number, d: DistribucionEstrella) => s + d.total, 0)
      const distribucionData = distribucion.map((d: DistribucionEstrella) => ({
        estrellas: `${d.estrellas} ★`,
        total: d.total,
        porcentaje: totalDist > 0 ? `${((d.total / totalDist) * 100).toFixed(1)}%` : '0%',
      }))
      const distribSheet = book.addFullSheet({
        name: 'Distribución',
        title: 'Distribución de Calificaciones por Estrellas',
        subtitle: periodo,
        columns: [
          { header: 'Estrellas', dataKey: 'estrellas', width: 20 },
          { header: 'Total Respuestas', dataKey: 'total', width: 22, align: 'center' },
          { header: 'Porcentaje', dataKey: 'porcentaje', width: 18, align: 'center' },
        ],
        data: distribucionData,
      })
      if (distribSheet.rowCount >= 4) {
        distribSheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: distribSheet.rowCount, column: 3 } }
      }

      // ── Sheet 4: Comentarios ──
      if (comentariosList.length > 0) {
        const comentariosData = comentariosList.map((c: EncuestaCompleta) => ({
          folio: c.solicitud?.folio ?? '—',
          evento: c.solicitud?.nombreEvento ?? '—',
          calificacion: `${c.satisfaccionGral} ★`,
          fecha: excelFormatShortDate(c.fechaRespuesta),
          comentario: c.comentarios ?? '',
        }))
        const comentSheet = book.addFullSheet({
          name: 'Comentarios',
          title: 'Comentarios y Retroalimentación de Usuarios',
          subtitle: subtitleMeta,
          columns: [
            { header: 'Folio', dataKey: 'folio', width: 18 },
            { header: 'Evento', dataKey: 'evento', width: 35 },
            { header: 'Calificación', dataKey: 'calificacion', width: 16, align: 'center' },
            { header: 'Fecha', dataKey: 'fecha', width: 16, align: 'center' },
            { header: 'Comentario', dataKey: 'comentario', width: 50 },
          ],
          data: comentariosData,
        })
        if (comentSheet.rowCount >= 4) {
          comentSheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: comentSheet.rowCount, column: 5 } }
        }
      }

      // ── Sheet 5: Encuestas / Crudo ──
      if (respuestas.length > 0) {
        const encuestasData = respuestas.map((e: EncuestaCompleta) => ({
          folio: e.solicitud?.folio ?? '—',
          evento: e.solicitud?.nombreEvento ?? '—',
          puntualidad: e.puntualidad,
          calidadTecnica: e.calidadTecnica,
          atencionStaff: e.atencionStaff,
          satisfaccionGral: e.satisfaccionGral,
          fecha: excelFormatShortDate(e.fechaRespuesta),
        }))
        const encSheet = book.addFullSheet({
          name: 'Encuestas - Crudo',
          title: 'Registro Completo de Encuestas Individuales',
          subtitle: subtitleMeta,
          columns: [
            { header: 'Folio', dataKey: 'folio', width: 18 },
            { header: 'Evento', dataKey: 'evento', width: 35 },
            { header: 'Puntualidad', dataKey: 'puntualidad', width: 18, align: 'center' },
            { header: 'Calidad Téc.', dataKey: 'calidadTecnica', width: 18, align: 'center' },
            { header: 'Atención', dataKey: 'atencionStaff', width: 18, align: 'center' },
            { header: 'Satisf. Gral', dataKey: 'satisfaccionGral', width: 18, align: 'center' },
            { header: 'Fecha', dataKey: 'fecha', width: 16, align: 'center' },
          ],
          data: encuestasData,
        })
        if (encSheet.rowCount >= 4) {
          encSheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: encSheet.rowCount, column: 7 } }
        }
      }

      await book.save('TigreTrack_Reporte_Satisfaccion.xlsx')
    } catch (e) {
      console.error('Error generando Excel de Satisfacción:', e)
    } finally {
      setExportandoExcel(false)
    }
  }

  // Estados de sub-navegación y filtros jerárquicos
  const [subTab, setSubTab] = useState<'logistica' | 'satisfacion'>('logistica')
  const [plantelFiltro, setPlantelFiltro] = useState<string>('todos')
  const [institucionFiltro, setInstitucionFiltro] = useState<string>('todos')

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError(null)

      const params: Record<string, string> = {
        plantel: plantelFiltro,
        institucion: institucionFiltro,
      }
      if (fechaInicio) params.fechaInicio = fechaInicio
      if (fechaFin) params.fechaFin = fechaFin

      try {
        const dashRes = await axios.get<DashboardData>('/api/estadisticas/dashboard', { params })
        setDashboard(dashRes.data)
      } catch (e) {
        console.error('Error al cargar dashboard estadístico:', e)
        setError('No se pudieron cargar las estadísticas. Verifica la conexión e intenta de nuevo.')
      }

      try {
        const todasRes = await axios.get<EncuestaCompleta[]>('/api/encuestas/todas', { params })
        setEncuestas(todasRes.data)
      } catch (e) {
        console.error('Error al cargar encuestas:', e)
      }

      setLoading(false)
    }
    fetchData()
  }, [plantelFiltro, institucionFiltro, fechaInicio, fechaFin])

  function reintentar() {
    const params: Record<string, string> = {
      plantel: plantelFiltro,
      institucion: institucionFiltro,
    }
    if (fechaInicio) params.fechaInicio = fechaInicio
    if (fechaFin) params.fechaFin = fechaFin

    setLoading(true)
    setError(null)

    Promise.all([
      axios.get<DashboardData>('/api/estadisticas/dashboard', { params }).then(r => setDashboard(r.data)),
      axios.get<EncuestaCompleta[]>('/api/encuestas/todas', { params }).then(r => setEncuestas(r.data)),
    ]).catch(e => {
      console.error('Error al reintentar cargar estadísticas:', e)
      setError('No se pudieron cargar las estadísticas. Verifica la conexión e intenta de nuevo.')
    }).finally(() => setLoading(false))
  }

  useEffect(() => {
    if (onCambioInstitucion) {
      const mapa: Record<string, 'umad' | 'prepa' | 'imm' | 'sistema'> = {
        UMAD: 'umad',
        'Prepa UMAD': 'prepa',
        IMM: 'imm',
        'IMM Secundaria': 'imm',
        'IMM Primaria': 'imm',
        'IMM Maternal': 'imm',
        'Ingenierías': 'umad',
        'Arte y Humanidades': 'umad',
        'Negocios, Comercio y Derecho': 'umad',
        'Ciencias Sociales': 'umad',
      }
      onCambioInstitucion(mapa[institucionFiltro] ?? 'sistema')
    }
  }, [institucionFiltro, onCambioInstitucion])

  const INSTITUCIONES_DE_IMM: readonly string[] = ['IMM Secundaria', 'IMM Primaria', 'IMM Maternal', 'Prepa UMAD']

  const manejarCambioPlantel = (plantel: string) => {
    setPlantelFiltro(plantel)
    if (plantel.startsWith('IMM') && institucionFiltro === 'UMAD') {
      setInstitucionFiltro('todos')
    }
    if (plantel === 'UMAD Campus Puebla' && INSTITUCIONES_DE_IMM.includes(institucionFiltro)) {
      setInstitucionFiltro('todos')
    }
  }

  const porInstitucionProcesado = useMemo(() => {
    try {
      const CATEGORIAS_OFICIALES = new Set([
        'Prepa UMAD',
        'Ingenierías',
        'Arte y Humanidades',
        'Negocios, Comercio y Derecho',
        'Ciencias Sociales',
        'IMM Secundaria',
        'IMM Primaria',
        'IMM Maternal',
      ])

      const MAP_LEGACY: Record<string, string> = {
        'UMAD': 'UMAD General',
        'IMM': 'IMM General',
      }

      const raw = Array.isArray(dashboard?.porInstitucion) ? dashboard.porInstitucion : []

      const nombresCategorias = [...CATEGORIAS_OFICIALES, 'UMAD General', 'IMM General', 'Otros']
      const categorias: Record<string, number> = {}
      for (const nom of nombresCategorias) {
        categorias[nom] = 0
      }

      let sumaInstituciones = 0
      for (const d of raw) {
        const inst = d?.nombre ?? ''
        const total = Number(d?.total) || 0

        if (CATEGORIAS_OFICIALES.has(inst)) {
          categorias[inst] += total
        } else if (MAP_LEGACY[inst] !== undefined) {
          categorias[MAP_LEGACY[inst]] += total
        } else {
          categorias['Otros'] += total
        }
        sumaInstituciones += total
      }

      const totalSolicitudes = Number(dashboard?.totalSolicitudes) || 0
      const resto = Math.max(0, totalSolicitudes - sumaInstituciones)
      if (resto > 0) {
        categorias['Otros'] += resto
      }

      return Object.entries(categorias)
        .filter(([ , count]) => count > 0)
        .map(([nombre, total]) => ({ nombre, total }))
        .sort((a, b) => b.total - a.total)
    } catch (e) {
      console.error('Error procesando porInstitucion:', e)
      return []
    }
  }, [dashboard])

  const porMesProcesado = useMemo(() =>
    (Array.isArray(dashboard?.porMes) ? dashboard.porMes : [])
      .map(m => ({ mes: m?.mes ?? '', total: Number(m?.total) || 0 }))
      .filter(m => m.total > 0),
  [dashboard])

  const porPlantelProcesado = useMemo(() =>
    (Array.isArray(dashboard?.porPlantel) ? dashboard.porPlantel : [])
      .map(p => ({ nombre: p?.nombre ?? '', total: Number(p?.total) || 0 }))
      .filter(p => p.total > 0),
  [dashboard])

  const MACRO_COLORS = useMemo<Record<string, string>>(() => ({
    'Universidad (UMAD)': '#1E3A8A',
    'Colegios (IMM / Prepa)': '#E11D48',
    Otros: '#64748B',
  }), [])

  const MAP_GLOBAL = useMemo<Record<string, string>>(() => ({
    'Ingenierías': 'Universidad (UMAD)',
    'Arte y Humanidades': 'Universidad (UMAD)',
    'Negocios, Comercio y Derecho': 'Universidad (UMAD)',
    'Ciencias Sociales': 'Universidad (UMAD)',
    'UMAD': 'Universidad (UMAD)',
    'Prepa UMAD': 'Colegios (IMM / Prepa)',
    'IMM Secundaria': 'Colegios (IMM / Prepa)',
    'IMM Primaria': 'Colegios (IMM / Prepa)',
    'IMM Maternal': 'Colegios (IMM / Prepa)',
  }), [])

  const porMacroProcesado = useMemo(() => {
    try {
      const raw = Array.isArray(dashboard?.porInstitucion) ? dashboard.porInstitucion : []
      const categorias: Record<string, number> = {
        'Universidad (UMAD)': 0,
        'Colegios (IMM / Prepa)': 0,
        Otros: 0,
      }

      let sumaInstituciones = 0
      for (const d of raw) {
        const inst = d?.nombre ?? ''
        const total = Number(d?.total) || 0
        const grupo = MAP_GLOBAL[inst] ?? 'Otros'
        categorias[grupo] += total
        sumaInstituciones += total
      }

      const plantelRaw = Array.isArray(dashboard?.porPlantel) ? dashboard.porPlantel : []
      let totalUMADPlantel = 0
      for (const p of plantelRaw) {
        if ((p?.nombre ?? '').toLowerCase().includes('umad')) {
          totalUMADPlantel += Number(p?.total) || 0
        }
      }

      const deficit = Math.max(0, totalUMADPlantel - categorias['Universidad (UMAD)'])
      const extraible = Math.min(categorias['Otros'], deficit)
      if (extraible > 0) {
        categorias['Otros'] -= extraible
        categorias['Universidad (UMAD)'] += extraible
      }

      const totalSolicitudes = Number(dashboard?.totalSolicitudes) || 0
      const resto = Math.max(0, totalSolicitudes - sumaInstituciones)
      if (resto > 0) {
        if (totalUMADPlantel > 0 && totalSolicitudes > 0) {
          const porcUMAD = totalUMADPlantel / totalSolicitudes
          const parteUMAD = Math.round(resto * porcUMAD)
          if (parteUMAD > 0) {
            categorias['Universidad (UMAD)'] += parteUMAD
            const parteOtros = resto - parteUMAD
            if (parteOtros > 0) {
              categorias['Otros'] += parteOtros
            }
          } else {
            categorias['Otros'] += resto
          }
        } else {
          categorias['Otros'] += resto
        }
      }

      return Object.entries(categorias)
        .filter(([ , v]) => v > 0)
        .map(([name, value]) => ({ name, value, color: MACRO_COLORS[name] ?? '#CBD5E1' }))
    } catch (e) {
      console.error('Error procesando porMacro:', e)
      return []
    }
  }, [dashboard, MACRO_COLORS, MAP_GLOBAL])

  const MAP_MATERIAL_NAME = useMemo<Record<string, string>>(() => ({
    Fotografia: 'Fotografía',
    Nota_Web: 'Nota Web',
    Banner: 'Banner',
    Otro: 'Otro',
  }), [])

  const porMaterialProcesado = useMemo(() => {
    try {
      const raw = Array.isArray(dashboard?.porMaterial) ? dashboard.porMaterial : []
      return raw
        .map(m => ({ name: MAP_MATERIAL_NAME[m?.tipo ?? ''] ?? m?.tipo ?? 'Otro', cantidad: Number(m?.total) || 0 }))
        .filter(m => m.cantidad > 0)
    } catch (e) {
      console.error('Error procesando porMaterial:', e)
      return []
    }
  }, [dashboard, MAP_MATERIAL_NAME])

  function calcularDiagnostico(globalAvg: number): { nivel: string; mensaje: string; color: string } {
    if (globalAvg >= 4.5) return { nivel: 'Excelente', mensaje: 'La calidad del servicio supera las expectativas. Se mantiene un nivel óptimo de satisfacción.', color: '#16A34A' }
    if (globalAvg >= 3.5) return { nivel: 'Bueno', mensaje: 'El servicio es satisfactorio. Existen oportunidades menores de mejora en algunos aspectos.', color: '#2563EB' }
    if (globalAvg >= 2.5) return { nivel: 'Aceptable', mensaje: 'El servicio cumple con lo mínimo esperado. Se recomienda implementar mejoras puntuales.', color: '#F59E0B' }
    if (globalAvg >= 1.5) return { nivel: 'Deficiente', mensaje: 'El servicio presenta deficiencias notables. Se requiere una revisión profunda de los procesos.', color: '#F97316' }
    return { nivel: 'Crítico', mensaje: 'El servicio no cumple con los estándares mínimos de calidad. Se necesita una intervención inmediata.', color: '#DC2626' }
  }

  // eslint-disable-next-line react-hooks/preserve-manual-memoization
  const encuestasFiltradas = useMemo(() => {
    return !encuestas ? []
      : selectedEncuestaId === 'todas' ? encuestas
      : encuestas.filter(e => String(e?.id) === String(selectedEncuestaId))
  }, [selectedEncuestaId, encuestas])

  const datosCSAT = useMemo(() => {
    if (selectedEncuestaId === 'todas') return null
    if (encuestasFiltradas.length === 0) return null

    const total = encuestasFiltradas.length
    const sum = (field: keyof EncuestaCompleta) =>
      encuestasFiltradas.reduce((s, e) => s + Number(e[field]), 0)
    const avg = (field: keyof EncuestaCompleta) => total > 0 ? sum(field) / total : 0

    const promedios = {
      puntualidad: Number(avg('puntualidad').toFixed(1)),
      calidadTecnica: Number(avg('calidadTecnica').toFixed(1)),
      atencionStaff: Number(avg('atencionStaff').toFixed(1)),
      satisfaccionGral: Number(avg('satisfaccionGral').toFixed(1)),
      totalEncuestas: total,
    }

    const globalAvg = (promedios.puntualidad + promedios.calidadTecnica + promedios.atencionStaff + promedios.satisfaccionGral) / 4

    const distMap: Record<number, number> = {}
    for (const e of encuestasFiltradas) {
      const key = e.satisfaccionGral
      distMap[key] = (distMap[key] ?? 0) + 1
    }
    const distribucion = [5, 4, 3, 2, 1].map(estrellas => ({ estrellas, total: distMap[estrellas] ?? 0 }))

    return {
      promedios,
      diagnostico: calcularDiagnostico(globalAvg),
      distribucion,
    }
  }, [encuestasFiltradas, selectedEncuestaId])

  if (loading) return <Skeleton />
  if (error) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', padding: '4rem 2rem', minHeight: '400px' }}>
        <AlertTriangle size={48} color="#DC2626" />
        <h2 style={{ margin: 0, fontSize: '1.3rem', fontWeight: 700, color: '#0F172A', textAlign: 'center' }}>Error al cargar estadísticas</h2>
        <p style={{ margin: 0, fontSize: '0.95rem', color: '#64748B', textAlign: 'center', maxWidth: '480px', lineHeight: 1.5 }}>{error}</p>
        <button
          onClick={reintentar}
          style={{
            padding: '0.6rem 1.5rem', background: '#1E3A8A', color: '#FFFFFF',
            border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '0.85rem',
            cursor: 'pointer', boxShadow: '0 4px 12px rgba(30,58,138,0.25)',
            transition: 'all 0.2s ease', display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#0F2B6B'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#1E3A8A'}
        >
          <Activity size={16} />
          Reintentar
        </button>
      </div>
    )
  }
  if (!dashboard) return null

  const {
    estadoData,
    tieneDatosMensuales,
    comentarios,
    KPI_CARDS,
    generarResumen,
  } = (() => {
    try {
      const estadoData = [
        { name: 'Pendientes', value: Number(dashboard.pendientes) || 0, color: STATUS_COLORS.Pendiente },
        { name: 'Aprobadas', value: Number(dashboard.aprobadas) || 0, color: STATUS_COLORS.Aprobado },
        { name: 'Completadas', value: Number(dashboard.completadas) || 0, color: STATUS_COLORS.Completada },
        { name: 'Canceladas', value: Number(dashboard.canceladas) || 0, color: STATUS_COLORS.Cancelada },
      ].filter(d => d.value > 0)

      const tieneDatosMensuales = porMesProcesado.length > 0

      const comentarios = encuestas
        .filter(e => e.comentarios && e.comentarios.trim().length > 0)
        .filter(e => selectedEncuestaId === 'todas' || String(e.id) === String(selectedEncuestaId))

      const KPI_CARDS = [
        { label: 'Total Solicitudes', value: Number(dashboard.totalSolicitudes) || 0, tendencia: Number(dashboard.tendencias?.totalSolicitudes) || 0, icon: Layers, color: '#1E3A8A', bg: 'rgba(30,58,138,0.06)' },
        { label: 'Pendientes', value: Number(dashboard.pendientes) || 0, tendencia: Number(dashboard.tendencias?.pendientes) || 0, icon: Clock, color: STATUS_COLORS.Pendiente, bg: 'rgba(245,158,11,0.08)' },
        { label: 'Aprobadas', value: Number(dashboard.aprobadas) || 0, tendencia: Number(dashboard.tendencias?.aprobadas) || 0, icon: CheckCircle, color: STATUS_COLORS.Aprobado, bg: 'rgba(30,58,138,0.08)' },
        { label: 'Completadas', value: Number(dashboard.completadas) || 0, tendencia: Number(dashboard.tendencias?.completadas) || 0, icon: Activity, color: STATUS_COLORS.Completada, bg: 'rgba(22,163,74,0.08)' },
        { label: 'Canceladas', value: Number(dashboard.canceladas) || 0, tendencia: Number(dashboard.tendencias?.canceladas) || 0, icon: XCircle, color: STATUS_COLORS.Cancelada, bg: 'rgba(225,29,72,0.08)' },
      ] as const

      const generarResumen = (): string => {
        try {
          const insights = dashboard.insights ?? {} as DashboardData['insights']
          const { tendenciaGeneral, plantelLider, institucionLider, mesMasActivo, tasaCancelacion } = insights
          const pct = Number(tendenciaGeneral?.porcentaje) || 0
          const tipo = tendenciaGeneral?.tipo ?? 'estable'
          const nomMes = mesMasActivo?.nombre ?? 'N/D'
          const nomPlantel = plantelLider?.nombre ?? 'N/D'
          const nomInst = institucionLider?.nombre ?? 'N/D'
          const tasa = Number(tasaCancelacion) || 0

          const cuerpo = tipo === 'crecimiento'
            ? `Se observa una tendencia positiva del ${pct}% respecto al mes anterior. ${nomMes} fue el periodo con mayor actividad. ${nomInst} concentra la mayor demanda institucional, mientras que ${nomPlantel} lidera la operación logística.`
            : tipo === 'decrecimiento'
              ? `Se registra una disminución del ${Math.abs(pct)}% respecto al mes anterior. A pesar de ello, ${nomMes} continúa siendo el periodo de mayor actividad y ${nomPlantel} mantiene el liderazgo operativo.`
              : `La operación se mantiene estable respecto al periodo anterior. ${nomMes} presenta la mayor actividad registrada y ${nomInst} concentra la mayor participación institucional.`

          const fraseFinal = tasa < 10
            ? 'La tasa de cancelación se mantiene dentro de parámetros óptimos.'
            : 'La tasa de cancelación requiere seguimiento para identificar oportunidades de mejora.'

          return `${cuerpo} ${fraseFinal}`
        } catch (e) {
          console.error('Error generando resumen ejecutivo:', e)
          return 'No hay datos suficientes para generar el resumen ejecutivo.'
        }
      }

      return { estadoData, tieneDatosMensuales, comentarios, KPI_CARDS, generarResumen }
    } catch (error) {
      console.error('Error procesando estadísticas del dashboard:', error)
      return {
        estadoData: [],
        tieneDatosMensuales: false,
        comentarios: [],
        KPI_CARDS: [],
        generarResumen: () => 'No hay datos suficientes para generar el resumen ejecutivo.',
      }
    }
  })()

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '2.5rem', 
      background: 'linear-gradient(135deg, #F8FAFC 0%, #E2E8F0 100%)', 
      backgroundImage: 'linear-gradient(to right, rgba(37, 99, 235, 0.015) 1px, transparent 1px), linear-gradient(to bottom, rgba(37, 99, 235, 0.015) 1px, transparent 1px)',
      backgroundSize: '40px 40px',
      borderRadius: '24px', 
      padding: '2.5rem',
      boxSizing: 'border-box',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      position: 'relative'
    }}>
      
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .kpi-card { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .kpi-card:hover { transform: translateY(-4px); box-shadow: 0 20px 40px -8px rgba(15, 23, 42, 0.08); }
        .insight-line-clamp { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; word-break: break-word; }
        .chart-card { animation: fadeInUp 0.5s ease forwards; opacity: 0; }
        .chart-card:nth-child(2) { animation-delay: 0.1s; }
        .chart-card:nth-child(3) { animation-delay: 0.2s; }
        .chart-card:nth-child(4) { animation-delay: 0.3s; }
      `}</style>
      {/* HEADER DE CONTROL INTEGRADO */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#E11D48', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '0.25rem' }}>
            TigreTrack Intelligence
          </div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, color: '#0F172A', letterSpacing: '-0.03em' }}>
            Análisis de Rendimiento y Calidad
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.95rem', fontWeight: 500, margin: '0.25rem 0 0 0' }}>Visualización consolidada del desempeño operativo y satisfacción institucional.</p>
        </div>

        {/* SELECTORES DE FILTRADO JERÁRQUICO INTERACTIVOS */}
        <div style={{ display: 'flex', gap: '1rem', background: COLORS.surface, padding: '0.5rem 1.25rem', borderRadius: '14px', border: '1px solid rgba(226, 232, 240, 0.8)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', alignItems: 'center' }}>
          <SlidersHorizontal size={16} color="#64748B" />
          
          <select 
            value={plantelFiltro} 
            onChange={(e) => manejarCambioPlantel(e.target.value)}
            style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem', fontWeight: 600, color: COLORS.textPrimary, outline: 'none', cursor: 'pointer' }}
          >
            <option value="todos">Todos los Planteles</option>
            <option value="UMAD Campus Puebla">UMAD Campus Puebla</option>
            <option value="IMM Campus Zavaleta">IMM Campus Zavaleta</option>
            <option value="IMM Campus Centro">IMM Campus Centro</option>
          </select>

          <select 
            value={institucionFiltro} 
            onChange={(e) => setInstitucionFiltro(e.target.value)}
            style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem', fontWeight: 600, color: COLORS.textPrimary, outline: 'none', cursor: 'pointer' }}
          >
            <option value="todos">Todas las Instituciones</option>
            {plantelFiltro !== 'IMM Campus Centro' && plantelFiltro !== 'IMM Campus Zavaleta' && <option value="UMAD">UMAD (Universidad)</option>}
            <option value="Prepa UMAD">Prepa UMAD</option>
            <option value="IMM Secundaria">IMM Secundaria</option>
            <option value="IMM Primaria">IMM Primaria</option>
            <option value="IMM Maternal">IMM Maternal</option>
            {plantelFiltro !== 'IMM Campus Centro' && plantelFiltro !== 'IMM Campus Zavaleta' && <>
              <option disabled style={{ fontStyle: 'italic', fontSize: '0.7rem' }}>─ Divisiones UMAD ─</option>
              <option value="Ingenierías">Ingenierías</option>
              <option value="Arte y Humanidades">Arte y Humanidades</option>
              <option value="Negocios, Comercio y Derecho">Negocios, Comercio y Derecho</option>
              <option value="Ciencias Sociales">Ciencias Sociales</option>
            </>}
          </select>

          <select
            value={rangoFechas}
            onChange={(e) => manejarCambioRango(e.target.value)}
            style={{ padding: '0.4rem 0.75rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem', fontWeight: 600, color: COLORS.textPrimary, outline: 'none', cursor: 'pointer' }}
          >
            <option value="todo">Todo el histórico</option>
            <option value="30d">Últimos 30 días</option>
            <option value="3m">Últimos 3 meses</option>
            <option value="6m">Últimos 6 meses</option>
            <option value="anio">Año actual</option>
            <option value="personalizado">Personalizado</option>
          </select>

          {rangoFechas === 'personalizado' && (
            <>
              <input
                type="date"
                value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)}
                style={{ padding: '0.4rem 0.6rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem', color: COLORS.textPrimary, outline: 'none' }}
              />
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                style={{ padding: '0.4rem 0.6rem', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.85rem', color: COLORS.textPrimary, outline: 'none' }}
              />
            </>
          )}
        </div>

        {/* BOTONES DE EXPORTACIÓN */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => handleExport('pdf')}
            disabled={exportandoPDF}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.45rem 1rem',
              background: exportandoPDF ? '#94A3B8' : '#1E3A8A',
              color: '#FFF',
              border: 'none', borderRadius: '10px',
              fontWeight: 700, fontSize: '0.8rem',
              cursor: exportandoPDF ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 10px rgba(30,58,138,0.2)',
            }}
          >
            <FileText size={15} />
            {exportandoPDF ? 'Generando PDF...' : 'Exportar PDF'}
          </button>
          <button
            onClick={() => handleExport('excel')}
            disabled={exportandoExcel}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.45rem 1rem',
              background: exportandoExcel ? '#94A3B8' : '#16A34A',
              color: '#FFF',
              border: 'none', borderRadius: '10px',
              fontWeight: 700, fontSize: '0.8rem',
              cursor: exportandoExcel ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 10px rgba(22,163,74,0.2)',
            }}
          >
            <FileSpreadsheet size={15} />
            {exportandoExcel ? 'Generando Excel...' : 'Exportar Excel'}
          </button>
        </div>
      </div>

      {/* SUB-NAVEGACIÓN DE PESTAÑAS (PILLS PREMIUM) */}
      <div style={{ display: 'flex', gap: '0.5rem', padding: '0.35rem', background: 'rgba(226, 232, 240, 0.6)', borderRadius: '9999px', width: 'fit-content' }}>
        <button
          onClick={() => setSubTab('logistica')}
          style={{
            padding: '0.6rem 1.75rem',
            background: subTab === 'logistica' ? '#0F2B6B' : 'transparent',
            color: subTab === 'logistica' ? COLORS.white : '#64748B',
            border: 'none',
            borderRadius: '9999px',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.88rem',
            boxShadow: subTab === 'logistica' ? '0 4px 12px rgba(15, 43, 107, 0.25)' : 'none',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          Panel Logístico y Operativo
        </button>
        <button
          onClick={() => setSubTab('satisfacion')}
          style={{
            padding: '0.6rem 1.75rem',
            background: subTab === 'satisfacion' ? '#0F2B6B' : 'transparent',
            color: subTab === 'satisfacion' ? COLORS.white : '#64748B',
            border: 'none',
            borderRadius: '9999px',
            fontWeight: 700,
            cursor: 'pointer',
            fontSize: '0.88rem',
            boxShadow: subTab === 'satisfacion' ? '0 4px 12px rgba(15, 43, 107, 0.25)' : 'none',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          Satisfacción y Calidad (CSAT)
        </button>
      </div>

      {/* APARTADO 1: LOGÍSTICA Y OPERACIONES */}
      {subTab === 'logistica' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {/* KPI CARDS CON VOLUMEN */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            {KPI_CARDS.map((kpi) => {
              const IconComp = kpi.icon
              return (
                <div 
                  key={kpi.label} 
                  className="kpi-card" 
                  title={`${kpi.label}: ${kpi.value}`}
                  style={{
                    background: COLORS.surface,
                    padding: '1.15rem 1.5rem',
                    borderRadius: '16px',
                    border: '1px solid rgba(226, 232, 240, 0.8)',
                    boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.03)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    transition: 'all 0.25s ease'
                  }}
                >
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <IconComp size={22} color={kpi.color} />
                  </div>
                  <div>
                    <div style={{ color: COLORS.textSecondary, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.15rem' }}>{kpi.label}</div>
                    <div style={{ fontSize: '2rem', fontWeight: 900, color: '#1E3A8A', lineHeight: 1.15 }}>{kpi.value}</div>
                    {(() => {
                      const t = kpi.tendencia
                      const arrow = t > 0 ? '↑' : t < 0 ? '↓' : '→'
                      const cor = t > 0 ? '#16A34A' : t < 0 ? '#E11D48' : '#64748B'
                      const txt = t > 0 ? `+${t}%` : t === 0 ? 'Sin cambios' : `${t}%`
                      return <div style={{ fontSize: '0.82rem', fontWeight: 700, color: cor, whiteSpace: 'nowrap' }}>{arrow} {txt} vs mes anterior</div>
                    })()}
                  </div>
                </div>
              )
            })}
          </div>

          {/* INSIGHTS ESTRATÉGICOS */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem' }}>
              <TrendingUp size={18} color="#E11D48" />
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>Insights Estratégicos</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
              {[
                {
                  label: 'Tendencia General',
                  icon: TrendingUp,
                  value: dashboard.insights?.tendenciaGeneral?.tipo === 'crecimiento'
                    ? `+${dashboard.insights?.tendenciaGeneral?.porcentaje ?? 0}%`
                    : dashboard.insights?.tendenciaGeneral?.tipo === 'decrecimiento'
                      ? `${dashboard.insights?.tendenciaGeneral?.porcentaje ?? 0}%`
                      : 'Estable',
                  desc: dashboard.insights?.tendenciaGeneral?.tipo === 'crecimiento'
                    ? `Incremento del ${dashboard.insights?.tendenciaGeneral?.porcentaje ?? 0}% respecto al mes anterior`
                    : dashboard.insights?.tendenciaGeneral?.tipo === 'decrecimiento'
                      ? `Decremento del ${Math.abs(dashboard.insights?.tendenciaGeneral?.porcentaje ?? 0)}% respecto al mes anterior`
                      : 'Sin cambios significativos respecto al mes anterior',
                  color: dashboard.insights?.tendenciaGeneral?.tipo === 'crecimiento' ? '#16A34A' : dashboard.insights?.tendenciaGeneral?.tipo === 'decrecimiento' ? '#E11D48' : '#64748B',
                  bg: dashboard.insights?.tendenciaGeneral?.tipo === 'crecimiento' ? 'rgba(22,163,74,0.08)' : dashboard.insights?.tendenciaGeneral?.tipo === 'decrecimiento' ? 'rgba(225,29,72,0.08)' : 'rgba(100,116,139,0.08)',
                },
                {
                  label: 'Plantel Líder',
                  icon: Trophy,
                  value: dashboard.insights?.plantelLider?.nombre ?? 'N/D',
                  desc: `${dashboard.insights?.plantelLider?.porcentaje ?? 0}% de las solicitudes`,
                  color: '#1E3A8A',
                  bg: 'rgba(30,58,138,0.06)',
                },
                {
                  label: 'Institución Líder',
                  icon: Building2,
                  value: dashboard.insights?.institucionLider?.nombre ?? 'N/D',
                  desc: `${dashboard.insights?.institucionLider?.porcentaje ?? 0}% de las solicitudes`,
                  color: '#16A34A',
                  bg: 'rgba(22,163,74,0.08)',
                },
                {
                  label: 'Mes Más Activo',
                  icon: Calendar,
                  value: dashboard.insights?.mesMasActivo?.nombre ?? 'N/D',
                  desc: `${dashboard.insights?.mesMasActivo?.total ?? 0} solicitudes`,
                  color: '#F59E0B',
                  bg: 'rgba(245,158,11,0.08)',
                },
                {
                  label: 'Tasa de Cancelación',
                  icon: AlertTriangle,
                  value: `${dashboard.insights?.tasaCancelacion ?? 0}%`,
                  desc: 'del total de solicitudes',
                  color: '#E11D48',
                  bg: 'rgba(225,29,72,0.08)',
                },
              ].map((card) => {
                const IconComp = card.icon
                const isNameCard = card.label === 'Plantel Líder' || card.label === 'Institución Líder'
                return (
                  <div
                    key={card.label}
                    className="kpi-card"
                    style={{
                      background: COLORS.surface,
                      padding: '1.15rem 1.5rem',
                      borderRadius: '16px',
                      border: '1px solid rgba(226, 232, 240, 0.8)',
                      boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.03)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      transition: 'all 0.25s ease',
                    }}
                  >
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <IconComp size={22} color={card.color} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: COLORS.textSecondary, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.15rem' }}>{card.label}</div>
                      <div style={{ fontSize: '1.15rem', fontWeight: 900, color: '#0F172A', lineHeight: 1.2, overflow: 'hidden', textOverflow: isNameCard ? undefined : 'ellipsis', whiteSpace: isNameCard ? 'normal' : 'nowrap' }} className={isNameCard ? 'insight-line-clamp' : undefined}>{card.value}</div>
                      <div style={{ fontSize: '0.78rem', fontWeight: 600, color: COLORS.textSecondary, marginTop: '0.2rem' }}>{card.desc}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* RESUMEN EJECUTIVO */}
          <div style={{
            background: COLORS.surface,
            borderRadius: '20px',
            border: '1px solid rgba(226, 232, 240, 0.8)',
            boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.03)',
            padding: '1.5rem 2rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
              <FileText size={18} color="#1E3A8A" />
              <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#0F172A' }}>Resumen Ejecutivo</h3>
            </div>
            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 500, color: '#334155', lineHeight: 1.6 }}>
              {generarResumen()}
            </p>
          </div>

          {/* GRÁFICAS OPERATIVAS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '2rem' }}>
            <div id="chart-mensual" className="chart-card" style={{ background: COLORS.surface, border: '1px solid rgba(226, 232, 240, 0.8)', borderRadius: '20px', padding: '1.75rem', boxShadow: '0 15px 35px -10px rgba(15, 23, 42, 0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
                <BarChart3 size={18} color="#1E3A8A" />
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>Solicitudes por Historial Mensual</h2>
              </div>
              {tieneDatosMensuales ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={porMesProcesado}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#64748B', fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: COLORS.surface, borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                    <Bar dataKey="total" fill="#1E3A8A" radius={[6, 6, 0, 0]} barSize={28}>
                      <LabelList dataKey="total" position="top" style={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} formatter={(v: unknown) => (v as number) > 0 ? v as number : ''} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '2rem 0' }}>
                  <BarChart3 size={32} color="#CBD5E1" />
                  <p style={{ color: '#64748B', textAlign: 'center', margin: 0 }}>No hay registros cronológicos.</p>
                </div>
              )}
            </div>

            <div id="chart-estado" className="chart-card" style={{ background: COLORS.surface, border: '1px solid rgba(226, 232, 240, 0.8)', borderRadius: '20px', padding: '1.75rem', boxShadow: '0 15px 35px -10px rgba(15, 23, 42, 0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
                <Activity size={18} color="#E11D48" />
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>Distribución Operativa por Estado</h2>
              </div>
              {estadoData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart margin={{ top: 10, right: 80, left: 80, bottom: 10 }}>
                    <Pie
                      data={Array.isArray(estadoData) ? estadoData : []}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      {estadoData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ background: COLORS.surface, borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                    <Legend verticalAlign="bottom" formatter={(value) => <span style={{ fontWeight: 600, color: '#0F172A' }}>{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '2rem 0' }}>
                  <Activity size={32} color="#CBD5E1" />
                  <p style={{ color: '#64748B', textAlign: 'center', margin: 0 }}>Sin datos de estados.</p>
                </div>
              )}
            </div>

            <div id="chart-macro" className="chart-card" style={{ background: COLORS.surface, border: '1px solid rgba(226, 232, 240, 0.8)', borderRadius: '20px', padding: '1.75rem', boxShadow: '0 15px 35px -10px rgba(15, 23, 42, 0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
                <Layers size={18} color="#1E3A8A" />
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>Distribución por Categoría Macro</h2>
              </div>
              {porMacroProcesado.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart margin={{ top: 10, right: 80, left: 80, bottom: 10 }}>
                    <Pie
                      data={porMacroProcesado}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      {porMacroProcesado.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: COLORS.surface, borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                      formatter={(value: unknown) => [`${(value as number).toLocaleString()} solicitudes`, '']}
                    />
                    <Legend verticalAlign="bottom" formatter={(value) => <span style={{ fontWeight: 600, color: '#0F172A' }}>{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '2rem 0' }}>
                  <Layers size={32} color="#CBD5E1" />
                  <p style={{ color: '#64748B', textAlign: 'center', margin: 0 }}>Sin datos macro.</p>
                </div>
              )}
            </div>

            <div id="chart-servicios" className="chart-card" style={{ background: COLORS.surface, border: '1px solid rgba(226, 232, 240, 0.8)', borderRadius: '20px', padding: '1.75rem', boxShadow: '0 15px 35px -10px rgba(15, 23, 42, 0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
                <Award size={18} color="#E11D48" />
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>Servicios de Cobertura más Demandados</h2>
              </div>
              {porMaterialProcesado.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={porMaterialProcesado}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748B', fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: COLORS.surface, borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                    <Bar dataKey="cantidad" fill="#1E3A8A" radius={[6, 6, 0, 0]} barSize={48}>
                      <LabelList dataKey="cantidad" position="top" style={{ fontSize: 13, fill: '#0F172A', fontWeight: 800 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '2rem 0' }}>
                  <Award size={32} color="#CBD5E1" />
                  <p style={{ color: '#64748B', textAlign: 'center', margin: 0 }}>Sin datos de cobertura.</p>
                </div>
              )}
            </div>

            <div id="chart-plantel" className="chart-card" style={{ background: COLORS.surface, border: '1px solid rgba(226, 232, 240, 0.8)', borderRadius: '20px', padding: '1.75rem', boxShadow: '0 15px 35px -10px rgba(15, 23, 42, 0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
                <Building2 size={18} color="#E11D48" />
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>Distribución Física por Plantel</h2>
              </div>
              {porPlantelProcesado.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={porPlantelProcesado} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748B' }} />
                    <YAxis type="category" dataKey="nombre" axisLine={false} tickLine={false} tick={{ fontWeight: 600, fill: '#0F172A' }} width={100} />
                    <Tooltip />
                    <Bar dataKey="total" radius={[0, 6, 6, 0]} barSize={16}>
                      {porPlantelProcesado.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
                      <LabelList dataKey="total" position="right" style={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '2rem 0' }}>
                  <Building2 size={32} color="#CBD5E1" />
                  <p style={{ color: '#64748B', textAlign: 'center', margin: 0 }}>Sin datos geográficos.</p>
                </div>
              )}
            </div>

            <div id="chart-institucion" className="chart-card" style={{ background: COLORS.surface, border: '1px solid rgba(226, 232, 240, 0.8)', borderRadius: '20px', padding: '1.75rem', boxShadow: '0 15px 35px -10px rgba(15, 23, 42, 0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
                <Users size={18} color="#1E3A8A" />
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>Distribución Académica por Institución</h2>
              </div>
              {porInstitucionProcesado.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={Array.isArray(porInstitucionProcesado) ? porInstitucionProcesado : []} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748B' }} />
                    <YAxis type="category" dataKey="nombre" axisLine={false} tickLine={false} tick={{ fontWeight: 600, fill: '#0F172A' }} width={120} />
                    <Tooltip />
                    <Bar dataKey="total" radius={[0, 6, 6, 0]} barSize={16}>
                      {porInstitucionProcesado.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
                      <LabelList dataKey="total" position="right" style={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', padding: '2rem 0' }}>
                  <Users size={32} color="#CBD5E1" />
                  <p style={{ color: '#64748B', textAlign: 'center', margin: 0 }}>Sin datos institucionales.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* APARTADO 2: CALIDAD Y SATISFACCION */}
      {subTab === 'satisfacion' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

          {/* MÉTRICAS CSAT — NUEVO DASHBOARD EJECUTIVO */}
          <div id="csat-section" style={{ background: COLORS.surface, border: '1px solid rgba(226, 232, 240, 0.8)', borderRadius: '20px', padding: '1.75rem 2rem', boxShadow: '0 15px 35px -10px rgba(15, 23, 42, 0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Award size={18} color="#F59E0B" />
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>Métricas de Satisfacción Institucional (CSAT)</h2>
              </div>
              <select
                value={selectedEncuestaId}
                onChange={e => setSelectedEncuestaId(e.target.value === 'todas' ? 'todas' : Number(e.target.value))}
                style={{
                  padding: '0.4rem 0.75rem', fontSize: '0.82rem', fontWeight: 600, color: '#0F172A',
                  background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '8px',
                  cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                }}
              >
                <option value="todas">Todas las Encuestas (Consolidado)</option>
                {encuestas.map(enc => (
                  <option key={enc.id} value={enc.id}>
                    {enc.solicitud?.nombreEvento ?? 'Evento'} - {formatDate(enc.fechaRespuesta)}
                  </option>
                ))}
              </select>
            </div>

            {(selectedEncuestaId === 'todas'
              ? (dashboard.promediosEncuesta && dashboard.promediosEncuesta.totalEncuestas > 0)
              : datosCSAT !== null
            ) ? (
              <SatisfaccionCalidad
                data={selectedEncuestaId === 'todas' ? dashboard.promediosEncuesta! : datosCSAT!.promedios}
                diagnostico={selectedEncuestaId === 'todas' ? (dashboard.diagnostico ?? null) : datosCSAT!.diagnostico}
                variacionCSAT={selectedEncuestaId === 'todas' ? (dashboard.variacionCSAT ?? null) : null}
                distribucionEstrellas={selectedEncuestaId === 'todas' ? (dashboard.distribucionEstrellas ?? []) : datosCSAT!.distribucion}
              />
            ) : (
              <p style={{ color: '#64748B', textAlign: 'center', padding: '2rem 0' }}>No hay encuestas para calcular promedios.</p>
            )}
          </div>

          {/* WALL / MURO DE OPINIONES CRONOLÓGICO */}
          <div style={{ background: COLORS.surface, border: '1px solid rgba(226, 232, 240, 0.8)', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 15px 35px -10px rgba(15, 23, 42, 0.04)' }}>
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <MessageSquare size={18} color="#1E3A8A" />
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>Muro de Opiniones y Comentarios Libres</h2>
            </div>

            {comentarios.length > 0 ? (
              <div style={{ maxHeight: '480px', overflowY: 'auto', padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {comentarios.map((e) => {
                    const solicitud = e.solicitud ?? ({} as EncuestaCompleta['solicitud'])
                    return (
                    <div key={e.id} style={{ padding: '1.25rem', background: '#F8FAFC', borderRadius: '14px', borderLeft: '4px solid #1E3A8A', border: '1px solid #F1F5F9', borderLeftColor: '#1E3A8A' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                        <div>
                          <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.92rem' }}>{solicitud?.nombreEvento ?? 'Evento sin nombre'}</div>
                          <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 500 }}>Folio: {solicitud?.folio ?? 'N/A'}</div>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>{formatDate(e.fechaRespuesta)}</span>
                      </div>
                      <div style={{ margin: '0.5rem 0' }}><Estrellas rating={e.satisfaccionGral} size={12} /></div>
                      <p style={{ margin: 0, fontSize: '0.88rem', color: '#334155', lineHeight: 1.5, fontWeight: 500 }}>"{e.comentarios ?? ''}"</p>
                    </div>
                    )
                  })}
              </div>
            ) : (
              <p style={{ color: '#64748B', textAlign: 'center', padding: '3rem' }}>No hay comentarios escritos registrados.</p>
            )}
          </div>

        </div>
      )}

    </div>
  )
}
