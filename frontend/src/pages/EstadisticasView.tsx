import { useEffect, useState } from 'react'
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
}

interface ResumenGlobal {
  promedio: number
  totalEncuestas: number
  distribucion: Record<number, number>
}

interface EncuestaCompleta {
  id: number
  solicitudId: number
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
  const [global, setGlobal] = useState<ResumenGlobal | null>(null)
  const [encuestas, setEncuestas] = useState<EncuestaCompleta[]>([])

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

  const handleExport = async (tipo: 'pdf' | 'excel') => {
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

  // Estados de sub-navegación y filtros jerárquicos
  const [subTab, setSubTab] = useState<'logistica' | 'satisfacion'>('logistica')
  const [plantelFiltro, setPlantelFiltro] = useState<string>('todos')
  const [institucionFiltro, setInstitucionFiltro] = useState<string>('todos')

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const params: Record<string, string> = {
          plantel: plantelFiltro,
          institucion: institucionFiltro,
        }
        if (fechaInicio) params.fechaInicio = fechaInicio
        if (fechaFin) params.fechaFin = fechaFin

        const [dashRes, globalRes, todasRes] = await Promise.all([
          axios.get<DashboardData>('/api/estadisticas/dashboard', { params }),
          axios.get<ResumenGlobal>('/api/encuestas/global', { params }),
          axios.get<EncuestaCompleta[]>('/api/encuestas/todas', { params }),
        ])

        setDashboard(dashRes.data)
        setGlobal(globalRes.data)
        setEncuestas(todasRes.data)
      } catch (e) {
        console.error('Error al cargar estadísticas:', e)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [plantelFiltro, institucionFiltro, fechaInicio, fechaFin])

  useEffect(() => {
    if (onCambioInstitucion) {
      const mapa: Record<string, 'umad' | 'prepa' | 'imm' | 'sistema'> = {
        UMAD: 'umad',
        'PREPA UMAD': 'prepa',
        IMM: 'imm',
      }
      onCambioInstitucion(mapa[institucionFiltro] ?? 'sistema')
    }
  }, [institucionFiltro, onCambioInstitucion])

  // Lógica para resetear institución si no pertenece al plantel seleccionado
  const manejarCambioPlantel = (plantel: string) => {
    setPlantelFiltro(plantel)
    if (plantel === 'IMM Campus Centro' && institucionFiltro === 'UMAD') {
      setInstitucionFiltro('todos')
    }
  }

  if (loading) return <Skeleton />
  if (!dashboard) return null

  const estadoData = [
    { name: 'Pendientes', value: dashboard.pendientes, color: STATUS_COLORS.Pendiente },
    { name: 'Aprobadas', value: dashboard.aprobadas, color: STATUS_COLORS.Aprobado },
    { name: 'Completadas', value: dashboard.completadas, color: STATUS_COLORS.Completada },
    { name: 'Canceladas', value: dashboard.canceladas, color: STATUS_COLORS.Cancelada },
  ].filter(d => d.value > 0)

  const tieneDatosMensuales = dashboard.porMes.some(m => m.total > 0)

  const distribucionArr = global
    ? [5, 4, 3, 2, 1].map(s => ({
        estrellas: s,
        count: global.distribucion[s] ?? 0,
        pct: global.totalEncuestas > 0 ? ((global.distribucion[s] ?? 0) / global.totalEncuestas) * 100 : 0,
      }))
    : []

  const maxDist = Math.max(...distribucionArr.map(d => d.count), 1)
  const comentarios = encuestas.filter(e => e.comentarios && e.comentarios.trim().length > 0)

  const KPI_CARDS = [
    { label: 'Total Solicitudes', value: dashboard.totalSolicitudes, tendencia: dashboard.tendencias.totalSolicitudes, icon: Layers, color: '#1E3A8A', bg: 'rgba(30,58,138,0.06)' },
    { label: 'Pendientes', value: dashboard.pendientes, tendencia: dashboard.tendencias.pendientes, icon: Clock, color: STATUS_COLORS.Pendiente, bg: 'rgba(245,158,11,0.08)' },
    { label: 'Aprobadas', value: dashboard.aprobadas, tendencia: dashboard.tendencias.aprobadas, icon: CheckCircle, color: STATUS_COLORS.Aprobado, bg: 'rgba(30,58,138,0.08)' },
    { label: 'Completadas', value: dashboard.completadas, tendencia: dashboard.tendencias.completadas, icon: Activity, color: STATUS_COLORS.Completada, bg: 'rgba(22,163,74,0.08)' },
    { label: 'Canceladas', value: dashboard.canceladas, tendencia: dashboard.tendencias.canceladas, icon: XCircle, color: STATUS_COLORS.Cancelada, bg: 'rgba(225,29,72,0.08)' },
  ] as const

  const generarResumen = () => {
    const { tendenciaGeneral, plantelLider, institucionLider, mesMasActivo, tasaCancelacion } = dashboard.insights
    const pct = tendenciaGeneral.porcentaje
    const tipo = tendenciaGeneral.tipo

    let cuerpo = ''
    if (tipo === 'crecimiento') {
      cuerpo = `Se observa una tendencia positiva del ${pct}% respecto al mes anterior. ${mesMasActivo.nombre} fue el periodo con mayor actividad. ${institucionLider.nombre} concentra la mayor demanda institucional, mientras que ${plantelLider.nombre} lidera la operación logística.`
    } else if (tipo === 'decrecimiento') {
      cuerpo = `Se registra una disminución del ${Math.abs(pct)}% respecto al mes anterior. A pesar de ello, ${mesMasActivo.nombre} continúa siendo el periodo de mayor actividad y ${plantelLider.nombre} mantiene el liderazgo operativo.`
    } else {
      cuerpo = `La operación se mantiene estable respecto al periodo anterior. ${mesMasActivo.nombre} presenta la mayor actividad registrada y ${institucionLider.nombre} concentra la mayor participación institucional.`
    }

    const fraseFinal = tasaCancelacion < 10
      ? 'La tasa de cancelación se mantiene dentro de parámetros óptimos.'
      : 'La tasa de cancelación requiere seguimiento para identificar oportunidades de mejora.'

    return `${cuerpo} ${fraseFinal}`
  }

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
            {plantelFiltro !== 'IMM Campus Centro' && <option value="UMAD">UMAD (Universidad)</option>}
            <option value="Prepa UMAD">Prepa UMAD</option>
            <option value="IMM">IMM</option>
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
                  value: dashboard.insights.tendenciaGeneral.tipo === 'crecimiento'
                    ? `+${dashboard.insights.tendenciaGeneral.porcentaje}%`
                    : dashboard.insights.tendenciaGeneral.tipo === 'decrecimiento'
                      ? `${dashboard.insights.tendenciaGeneral.porcentaje}%`
                      : 'Estable',
                  desc: dashboard.insights.tendenciaGeneral.tipo === 'crecimiento'
                    ? `Incremento del ${dashboard.insights.tendenciaGeneral.porcentaje}% respecto al mes anterior`
                    : dashboard.insights.tendenciaGeneral.tipo === 'decrecimiento'
                      ? `Decremento del ${Math.abs(dashboard.insights.tendenciaGeneral.porcentaje)}% respecto al mes anterior`
                      : 'Sin cambios significativos respecto al mes anterior',
                  color: dashboard.insights.tendenciaGeneral.tipo === 'crecimiento' ? '#16A34A' : dashboard.insights.tendenciaGeneral.tipo === 'decrecimiento' ? '#E11D48' : '#64748B',
                  bg: dashboard.insights.tendenciaGeneral.tipo === 'crecimiento' ? 'rgba(22,163,74,0.08)' : dashboard.insights.tendenciaGeneral.tipo === 'decrecimiento' ? 'rgba(225,29,72,0.08)' : 'rgba(100,116,139,0.08)',
                },
                {
                  label: 'Plantel Líder',
                  icon: Trophy,
                  value: dashboard.insights.plantelLider.nombre,
                  desc: `${dashboard.insights.plantelLider.porcentaje}% de las solicitudes`,
                  color: '#1E3A8A',
                  bg: 'rgba(30,58,138,0.06)',
                },
                {
                  label: 'Institución Líder',
                  icon: Building2,
                  value: dashboard.insights.institucionLider.nombre,
                  desc: `${dashboard.insights.institucionLider.porcentaje}% de las solicitudes`,
                  color: '#16A34A',
                  bg: 'rgba(22,163,74,0.08)',
                },
                {
                  label: 'Mes Más Activo',
                  icon: Calendar,
                  value: dashboard.insights.mesMasActivo.nombre,
                  desc: `${dashboard.insights.mesMasActivo.total} solicitudes`,
                  color: '#F59E0B',
                  bg: 'rgba(245,158,11,0.08)',
                },
                {
                  label: 'Tasa de Cancelación',
                  icon: AlertTriangle,
                  value: `${dashboard.insights.tasaCancelacion}%`,
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
            <div className="chart-card" style={{ background: COLORS.surface, border: '1px solid rgba(226, 232, 240, 0.8)', borderRadius: '20px', padding: '1.75rem', boxShadow: '0 15px 35px -10px rgba(15, 23, 42, 0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
                <BarChart3 size={18} color="#1E3A8A" />
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>Solicitudes por Historial Mensual</h2>
              </div>
              {tieneDatosMensuales ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dashboard.porMes}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#64748B', fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748B' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ background: COLORS.surface, borderRadius: '10px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }} />
                    <Bar dataKey="total" fill="#1E3A8A" radius={[6, 6, 0, 0]} barSize={28}>
                      <LabelList dataKey="total" position="top" style={{ fontSize: 11, fill: '#64748B', fontWeight: 600 }} formatter={(v: number) => v > 0 ? v : ''} />
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

            <div className="chart-card" style={{ background: COLORS.surface, border: '1px solid rgba(226, 232, 240, 0.8)', borderRadius: '20px', padding: '1.75rem', boxShadow: '0 15px 35px -10px rgba(15, 23, 42, 0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
                <Activity size={18} color="#E11D48" />
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>Distribución Operativa por Estado</h2>
              </div>
              {estadoData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart margin={{ top: 10, right: 80, left: 80, bottom: 10 }}>
                    <Pie
                      data={estadoData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
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

            <div className="chart-card" style={{ background: COLORS.surface, border: '1px solid rgba(226, 232, 240, 0.8)', borderRadius: '20px', padding: '1.75rem', boxShadow: '0 15px 35px -10px rgba(15, 23, 42, 0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
                <Building2 size={18} color="#E11D48" />
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>Distribución Física por Plantel</h2>
              </div>
              {dashboard.porPlantel.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dashboard.porPlantel} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748B' }} />
                    <YAxis type="category" dataKey="nombre" axisLine={false} tickLine={false} tick={{ fontWeight: 600, fill: '#0F172A' }} width={100} />
                    <Tooltip />
                    <Bar dataKey="total" radius={[0, 6, 6, 0]} barSize={16}>
                      {dashboard.porPlantel.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
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

            <div className="chart-card" style={{ background: COLORS.surface, border: '1px solid rgba(226, 232, 240, 0.8)', borderRadius: '20px', padding: '1.75rem', boxShadow: '0 15px 35px -10px rgba(15, 23, 42, 0.04)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
                <Users size={18} color="#1E3A8A" />
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>Distribución Académica por Institución</h2>
              </div>
              {dashboard.porInstitucion.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={dashboard.porInstitucion} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#64748B' }} />
                    <YAxis type="category" dataKey="nombre" axisLine={false} tickLine={false} tick={{ fontWeight: 600, fill: '#0F172A' }} width={100} />
                    <Tooltip />
                    <Bar dataKey="total" radius={[0, 6, 6, 0]} barSize={16}>
                      {dashboard.porInstitucion.map((_, idx) => <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />)}
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
          
          {/* HISTOGRAMA DE ESTRELLAS */}
          <div style={{ background: COLORS.surface, border: '1px solid rgba(226, 232, 240, 0.8)', borderRadius: '20px', padding: '2rem', boxShadow: '0 15px 35px -10px rgba(15, 23, 42, 0.04)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '2rem' }}>
              <Award size={18} color="#F59E0B" />
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>Métricas de Satisfacción Institucional (CSAT)</h2>
            </div>
            
            {((): React.ReactNode => {
              const p = dashboard.promediosEncuesta
              if (!p || p.totalEncuestas <= 0) {
                return <p style={{ color: '#64748B', textAlign: 'center' }}>No hay encuestas para calcular promedios.</p>
              }

              const valor = p.satisfaccionGral
              const pct = (valor / 5) * 100
              const ringColor = pct >= 85 ? '#10B981' : pct >= 70 ? '#F59E0B' : '#EF4444'
              const size = 130
              const stroke = 10
              const r = (size - stroke) / 2
              const circ = 2 * Math.PI * r
              const offset = circ - (pct / 100) * circ

              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '3.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ textAlign: 'center', paddingRight: '1rem' }}>
                    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
                      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#F1F5F9" strokeWidth={stroke} />
                        <circle
                          cx={size / 2}
                          cy={size / 2}
                          r={r}
                          fill="none"
                          stroke={ringColor}
                          strokeWidth={stroke}
                          strokeLinecap="round"
                          strokeDasharray={circ}
                          strokeDashoffset={offset}
                          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)' }}
                        />
                      </svg>
                      <div style={{
                        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <span style={{ fontSize: '2rem', fontWeight: 900, color: '#0F172A', lineHeight: 1 }}>{valor.toFixed(1)}</span>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: ringColor, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          {pct >= 85 ? 'Excelente' : pct >= 70 ? 'Regular' : 'Crítico'}
                        </span>
                      </div>
                    </div>
                    <div style={{ margin: '0.5rem 0' }}><Estrellas rating={valor} size={16} /></div>
                    <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Satisfacción General de {p.totalEncuestas} Evaluaciones</div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {[
                      { label: 'Puntualidad', key: 'puntualidad' as const, color: '#3B82F6' },
                      { label: 'Calidad Técnica', key: 'calidadTecnica' as const, color: '#8B5CF6' },
                      { label: 'Atención del Staff', key: 'atencionStaff' as const, color: '#EC4899' },
                    ].map((bar) => {
                      const v = p[bar.key]
                      const pc = (v / 5) * 100
                      return (
                        <div key={bar.key}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '0.3rem' }}>
                            <span style={{ fontWeight: 600, color: '#0F172A' }}>{bar.label}</span>
                            <span style={{ fontWeight: 700, color: bar.color }}>{v.toFixed(1)} / 5</span>
                          </div>
                          <div style={{ width: '100%', height: '10px', background: '#F1F5F9', borderRadius: '9999px', overflow: 'hidden', boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.04)' }}>
                            <div style={{
                              height: '100%',
                              borderRadius: '9999px',
                              width: `${pc}%`,
                              background: `linear-gradient(90deg, ${bar.color}bb, ${bar.color})`,
                              transition: 'width 1s cubic-bezier(0.4,0,0.2,1)',
                              boxShadow: `0 0 8px ${bar.color}55`,
                            }} />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
          </div>

          {/* WALL / MURO DE OPINIONES CRONOLÓGICO */}
          <div style={{ background: COLORS.surface, border: '1px solid rgba(226, 232, 240, 0.8)', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 15px 35px -10px rgba(15, 23, 42, 0.04)' }}>
            <div style={{ padding: '1.5rem 2rem', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <MessageSquare size={18} color="#1E3A8A" />
              <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>Muro de Opiniones y Comentarios Libres</h2>
            </div>

            {comentarios.length > 0 ? (
              <div style={{ maxHeight: '480px', overflowY: 'auto', padding: '1.5rem 2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {comentarios.map((e) => (
                  <div key={e.id} style={{ padding: '1.25rem', background: '#F8FAFC', borderRadius: '14px', borderLeft: '4px solid #1E3A8A', border: '1px solid #F1F5F9', borderLeftColor: '#1E3A8A' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.92rem' }}>{e.solicitud.nombreEvento}</div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 500 }}>Folio: {e.solicitud.folio}</div>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>{formatDate(e.fechaRespuesta)}</span>
                    </div>
                    <div style={{ margin: '0.5rem 0' }}><Estrellas rating={e.satisfaccionGral} size={12} /></div>
                    <p style={{ margin: 0, fontSize: '0.88rem', color: '#334155', lineHeight: 1.5, fontWeight: 500 }}>"{e.comentarios}"</p>
                  </div>
                ))}
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
