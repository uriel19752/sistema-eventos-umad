import { useEffect, useState } from 'react'
import axios from 'axios'
import { Star, ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react'

interface EncuestaCompleta {
  id: number
  solicitudId: number
  calificacion: number
  comentarios: string | null
  fechaRespuesta: string
  solicitud: {
    folio: string
    nombreEvento: string
    fechaEvento: string
  }
}

interface ResumenCancelaciones {
  total: number
  tardias: number
  enTiempo: number
}

interface ResumenGlobal {
  promedio: number
  totalEncuestas: number
  distribucion: Record<number, number>
}

const COLORS = {
  primary: '#1e3a8a',
  secondary: '#dc2626',
  background: '#f8fafc',
  surface: '#ffffff',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  white: '#ffffff',
  accent: '#f59e0b',
}

function renderEstrellas(rating: number, size: number) {
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          size={size}
          fill={star <= rating ? COLORS.accent : 'transparent'}
          color={star <= rating ? COLORS.accent : COLORS.textSecondary}
        />
      ))}
    </div>
  )
}

export default function EstadisticasView() {
  const [resumenGlobal, setResumenGlobal] = useState<ResumenGlobal | null>(null)
  const [resumenCancelaciones, setResumenCancelaciones] = useState<ResumenCancelaciones | null>(null)
  const [encuestas, setEncuestas] = useState<EncuestaCompleta[]>([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    async function cargarDatos() {
      try {
        const [globalRes, cancelacionesRes, todasRes] = await Promise.all([
          axios.get<ResumenGlobal>('/api/encuestas/global'),
          axios.get<ResumenCancelaciones>('/api/auditorias/cancelaciones'),
          axios.get<EncuestaCompleta[]>('/api/encuestas/todas'),
        ])
        setResumenGlobal(globalRes.data)
        setResumenCancelaciones(cancelacionesRes.data)
        setEncuestas(todasRes.data)
      } catch {
        // silently fail
      } finally {
        setCargando(false)
      }
    }
    cargarDatos()
  }, [])

  if (cargando) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: COLORS.textSecondary }}>
        Cargando métricas...
      </div>
    )
  }

  const distribucion = resumenGlobal?.distribucion ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  const totalEncuestas = resumenGlobal?.totalEncuestas ?? 0
  const totalCancelaciones = resumenCancelaciones?.total ?? 0
  const cancelacionesTardias = resumenCancelaciones?.tardias ?? 0
  const cancelacionesEnTiempo = resumenCancelaciones?.enTiempo ?? 0
  const pctTardias = totalCancelaciones > 0 ? ((cancelacionesTardias / totalCancelaciones) * 100).toFixed(1) : '0.0'

  const maxDistribucion = Math.max(...Object.values(distribucion), 1)

  const comentarios = encuestas.filter(e => e.comentarios && e.comentarios.trim().length > 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: COLORS.primary }}>
        Métricas y Rendimiento Institucional
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
        <div style={{ background: '#fef2f2', padding: '1.5rem', borderRadius: '16px', border: '1px solid #fecaca', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <ThumbsDown size={20} color={COLORS.secondary} />
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: COLORS.secondary }}>Tasa de Cancelaciones Tardías</span>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: COLORS.secondary }}>{pctTardias}%</div>
          <div style={{ fontSize: '0.85rem', color: '#991b1b', marginTop: '0.25rem' }}>
            {cancelacionesTardias} de {totalCancelaciones} cancelaciones fueron tardías
          </div>
        </div>

        <div style={{ background: '#f0fdf4', padding: '1.5rem', borderRadius: '16px', border: '1px solid #bbf7d0', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <ThumbsUp size={20} color="#16a34a" />
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#166534' }}>Cancelaciones en Tiempo</span>
          </div>
          <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#16a34a' }}>{cancelacionesEnTiempo}</div>
          <div style={{ fontSize: '0.85rem', color: '#166534', marginTop: '0.25rem' }}>
            Cancelaciones que cumplieron el SLA de 48 horas
          </div>
        </div>

        <div style={{ background: COLORS.surface, padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <Star size={20} color={COLORS.accent} fill={COLORS.accent} />
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: COLORS.textPrimary }}>Distribución de Calificaciones</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = distribucion[star] ?? 0
              const pct = totalEncuestas > 0 ? (count / totalEncuestas) * 100 : 0
              return (
                <div key={star}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: COLORS.textSecondary, marginBottom: '0.2rem' }}>
                    <span>{star} estrella{star !== 1 ? 's' : ''}</span>
                    <span>{count} ({pct.toFixed(0)}%)</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: '#facc15', borderRadius: '4px', transition: 'width 0.4s' }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div style={{ background: COLORS.surface, borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
        <div style={{ padding: '1.5rem 1.5rem 0.75rem', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <MessageSquare size={20} color={COLORS.primary} />
            <h2 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: COLORS.textPrimary }}>
              Feed Global de Opiniones
            </h2>
            <span style={{ fontSize: '0.8rem', color: COLORS.textSecondary, marginLeft: '0.5rem' }}>
              ({comentarios.length} comentario{comentarios.length !== 1 ? 's' : ''})
            </span>
          </div>
        </div>
        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {comentarios.length > 0 ? comentarios.map((e) => (
            <div
              key={e.id}
              style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid #f1f5f9',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(ev) => (ev.currentTarget.style.background = '#f8fafc')}
              onMouseLeave={(ev) => (ev.currentTarget.style.background = 'transparent')}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                <div>
                  <span style={{ fontWeight: 600, color: COLORS.primary, fontSize: '0.9rem' }}>{e.solicitud.nombreEvento}</span>
                  <span style={{ color: COLORS.textSecondary, fontSize: '0.8rem', marginLeft: '0.75rem' }}>Folio: {e.solicitud.folio}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {renderEstrellas(e.calificacion, 12)}
                  <span style={{ fontSize: '0.75rem', color: COLORS.textSecondary, whiteSpace: 'nowrap' }}>
                    {new Date(e.fechaRespuesta).toLocaleDateString()}
                  </span>
                </div>
              </div>
              <p style={{ margin: 0, fontSize: '0.9rem', color: COLORS.textPrimary, lineHeight: '1.5' }}>
                {e.comentarios}
              </p>
            </div>
          )) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: COLORS.textSecondary, fontSize: '0.9rem' }}>
              No hay comentarios registrados en las encuestas.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
