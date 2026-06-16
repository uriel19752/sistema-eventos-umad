import { useEffect, useState } from 'react'
import axios from 'axios'
import { CheckCircle, Star } from 'lucide-react'

interface Plantel {
  id: number
  nombre: string
}

interface Institucion {
  id: number
  nombre: string
}

interface Solicitud {
  id: number
  folio: string
  nombreEvento: string
  fechaEvento: string
  horaInicio: string
  estado: string
  prioridad: string
  plantel: Plantel
  institucion: Institucion
}

interface Material {
  id: number
  solicitudId: number
  tipoMaterial: string
  descripcionOtro: string | null
}

interface Encuesta {
  id: number
  solicitudId: number
  calificacion: number
  comentarios: string | null
  fechaRespuesta: string
}

type FiltroInstitucion = '' | 'UMAD' | 'IMM'

const COLORS = {
  primary: '#1e3a8a',
  secondary: '#dc2626',
  background: '#f8fafc',
  surface: '#ffffff',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  white: '#ffffff',
  accent: '#f59e0b'
}

export default function Dashboard() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [filtro, setFiltro] = useState<FiltroInstitucion>('')
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<number | null>(null)
  const [materiales, setMateriales] = useState<Material[]>([])
  const [cargandoMateriales, setCargandoMateriales] = useState(false)

  const [encuestas, setEncuestas] = useState<Encuesta[]>([])
  const [promedioEncuesta, setPromedioEncuesta] = useState(0)
  const [nuevaCalificacion, setNuevaCalificacion] = useState(5)
  const [nuevosComentarios, setNuevosComentarios] = useState('')
  const [guardandoEncuesta, setGuardandoEncuesta] = useState(false)


  const [promedioGlobal, setPromedioGlobal] = useState(0)
  const [totalEncuestasGlobal, setTotalEncuestasGlobal] = useState(0)

  async function cargarSolicitudes() {
    try {
      const res = await axios.get('/api/solicitudes')
      setSolicitudes(res.data)
    } catch {
      // Fail silently as error is not used in UI
    }
  }

  async function cargarResumenGlobal() {
    try {
      const res = await axios.get('/api/encuestas/global')
      setPromedioGlobal(res.data.promedio)
      setTotalEncuestasGlobal(res.data.totalEncuestas)
    } catch {
      // silently fail
    }
  }

  useEffect(() => {
    cargarSolicitudes()
    cargarResumenGlobal()
  }, [])

  useEffect(() => {
    async function cargarMateriales() {
      if (solicitudSeleccionada === null) {
        setMateriales([])
        return
      }
      setCargandoMateriales(true)
      try {
        const res = await axios.get(`/api/materiales/solicitud/${solicitudSeleccionada}`)
        setMateriales(res.data)
      } catch {
        setMateriales([])
      } finally {
        setCargandoMateriales(false)
      }
    }
    cargarMateriales()
  }, [solicitudSeleccionada])

  useEffect(() => {
    async function cargarEncuestas() {
      if (solicitudSeleccionada === null) {
        setEncuestas([])
        setPromedioEncuesta(0)
        return
      }
      try {
        const res = await axios.get(`/api/encuestas/solicitud/${solicitudSeleccionada}`)
        setEncuestas(res.data.encuestas)
        setPromedioEncuesta(res.data.promedio)
      } catch {
        setEncuestas([])
        setPromedioEncuesta(0)
      }
    }
    cargarEncuestas()
  }, [solicitudSeleccionada])

  async function manejarCancelacion(id: number) {
    try {
      await axios.patch(`/api/solicitudes/${id}/estado`, { estado: 'Cancelada' })
      await cargarSolicitudes()
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error ?? 'Error al cancelar la solicitud'
        : 'Error de conexión'
      alert(msg)
    }
  }

  async function guardarEncuesta() {
    if (solicitudSeleccionada === null) return
    setGuardandoEncuesta(true)
    try {
      await axios.post('/api/encuestas', {
        solicitud_id: solicitudSeleccionada,
        calificacion: nuevaCalificacion,
        comentarios: nuevosComentarios.trim() || null,
      })
      const res = await axios.get(`/api/encuestas/solicitud/${solicitudSeleccionada}`)
      setEncuestas(res.data.encuestas)
      setPromedioEncuesta(res.data.promedio)
    } finally {
      setGuardandoEncuesta(false)
    }
  }

  const renderEstrellas = (rating: number, size: number) => {
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

  const filtradas = solicitudes.filter(s => 
    filtro === '' || s.institucion.nombre.includes(filtro)
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        <div style={{ background: COLORS.surface, padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
          <div style={{ color: COLORS.textSecondary, fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Total Solicitudes</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: COLORS.primary }}>{solicitudes.length}</div>
        </div>
        <div style={{ background: COLORS.surface, padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
          <div style={{ color: COLORS.textSecondary, fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Satisfacción Global</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: COLORS.primary }}>{promedioGlobal.toFixed(1)} / 5</div>
        </div>
        <div style={{ background: COLORS.surface, padding: '1.5rem', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
          <div style={{ color: COLORS.textSecondary, fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.5rem' }}>Encuestas Recibidas</div>
          <div style={{ fontSize: '2rem', fontWeight: 800, color: COLORS.primary }}>{totalEncuestasGlobal}</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem' }}>
        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: COLORS.textPrimary }}>Gestión de Solicitudes</div>
        <select 
          value={filtro} 
          onChange={(e) => setFiltro(e.target.value as FiltroInstitucion)}
          style={{ padding: '0.4rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
        >
          <option value="">Todas las Instituciones</option>
          <option value="UMAD">UMAD</option>
          <option value="IMM">IMM</option>
        </select>
      </div>

      {solicitudSeleccionada !== null && (
        <div style={{ 
          background: COLORS.surface, 
          padding: '1.5rem', 
          borderRadius: '16px', 
          border: '1px solid #e2e8f0', 
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          marginBottom: '2rem' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: COLORS.primary }}>Detalles de Solicitud</h2>
            <button 
              onClick={() => setSolicitudSeleccionada(null)} 
              style={{ background: 'none', border: 'none', color: COLORS.textSecondary, cursor: 'pointer', fontSize: '0.9rem' }}
            >
              Cerrar
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: COLORS.textPrimary, marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>Materiales Solicitados</h3>
              {cargandoMateriales ? (
                <div style={{ color: COLORS.textSecondary, fontSize: '0.9rem' }}>Cargando materiales...</div>
              ) : materiales.length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {materiales.map(m => (
                    <li key={m.id} style={{ padding: '0.5rem 0', fontSize: '0.9rem', color: COLORS.textPrimary, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle size={14} color={COLORS.primary} />
                      {m.tipoMaterial} {m.descripcionOtro && `(${m.descripcionOtro})`}
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={{ color: COLORS.textSecondary, fontSize: '0.9rem' }}>No hay materiales especificados.</div>
              )}
            </div>

            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: COLORS.textPrimary, marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>Satisfacción del Evento</h3>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: COLORS.primary }}>{promedioEncuesta.toFixed(1)}</div>
                <div>
                  <div style={{ display: 'flex', gap: '2px' }}>{renderEstrellas(Math.round(promedioEncuesta), 16)}</div>
                  <div style={{ fontSize: '0.85rem', color: COLORS.textSecondary }}>Promedio de {encuestas.length} encuestas</div>
                </div>
              </div>

              <div style={{ background: '#f1f5f9', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: COLORS.textPrimary, marginBottom: '0.75rem' }}>Nueva Evaluación</div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
                  {renderEstrellas(nuevaCalificacion, 20)}
                  <input 
                    type="range" min="1" max="5" step="1" value={nuevaCalificacion} 
                    onChange={(e) => setNuevaCalificacion(parseInt(e.target.value))}
                    style={{ flexGrow: 1 }}
                  />
                </div>
                <textarea 
                  value={nuevosComentarios} 
                  onChange={(e) => setNuevosComentarios(e.target.value)} 
                  placeholder="Comentarios adicionales..."
                  style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', marginBottom: '0.5rem', fontFamily: 'inherit' }}
                />
                <button 
                  onClick={guardarEncuesta} 
                  disabled={guardandoEncuesta}
                  style={{ 
                    width: '100%', padding: '0.6rem', background: COLORS.primary, color: COLORS.white, 
                    border: 'none', borderRadius: '6px', fontWeight: 600, cursor: guardandoEncuesta ? 'not-allowed' : 'pointer' 
                  }}
                >
                  {guardandoEncuesta ? 'Guardando...' : 'Guardar Evaluación'}
                </button>
              </div>

              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: COLORS.textPrimary, marginBottom: '0.75rem' }}>Comentarios Recibidos</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {encuestas
                  .filter((e) => e.comentarios)
                  .map((e) => (
                    <div key={e.id} style={{
                      padding: '0.6rem 0.75rem',
                      background: '#f8fafc',
                      borderRadius: '6px',
                      borderLeft: '3px solid #f59e0b',
                    }}>
                      <div style={{ marginBottom: '0.2rem' }}>{renderEstrellas(e.calificacion, 12)}</div>
                      <p style={{ margin: 0, fontSize: '0.85rem', color: COLORS.textPrimary, lineHeight: '1.4' }}>
                        {e.comentarios}
                      </p>
                    </div>
                  ))}
                {encuestas.filter(e => e.comentarios).length === 0 && (
                  <div style={{ color: COLORS.textSecondary, fontSize: '0.85rem' }}>No hay comentarios disponibles.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {filtradas.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead style={{ background: COLORS.primary, color: COLORS.white }}>
              <tr>
                <th style={thStyle}>Folio</th>
                <th style={thStyle}>Evento</th>
                <th style={thStyle}>Institución</th>
                <th style={thStyle}>Plantel</th>
                <th style={thStyle}>Fecha</th>
                <th style={thStyle}>Estado</th>
                <th style={thStyle}>Acciones</th>
              </tr>
            </thead>
            <tbody style={{ background: COLORS.surface }}>
              {filtradas.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={tdStyle}>{s.folio}</td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => setSolicitudSeleccionada(s.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: COLORS.primary,
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0,
                        fontSize: '0.9rem',
                      }}
                    >
                      {s.nombreEvento}
                    </button>
                  </td>
                  <td style={tdStyle}>{s.institucion.nombre}</td>
                  <td style={tdStyle}>{s.plantel.nombre}</td>
                  <td style={tdStyle}>{new Date(s.fechaEvento).toLocaleDateString()}</td>
                  <td style={tdStyle}>
                    <span
                      style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        background:
                          s.estado === 'Cancelada' ? '#fee2e2' :
                          s.estado === 'Completada' ? '#dcfce7' :
                          s.estado === 'Aprobado' ? '#dbeafe' :
                          '#fef3c7',
                        color:
                          s.estado === 'Cancelada' ? COLORS.secondary :
                          s.estado === 'Completada' ? '#16a34a' :
                          s.estado === 'Aprobado' ? COLORS.primary :
                          '#856404',
                      }}
                    >
                      {s.estado}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {s.estado !== 'Cancelada' && (
                      <button
                        onClick={() => manejarCancelacion(s.id)}
                        style={{
                          background: COLORS.secondary,
                          color: COLORS.white,
                          border: 'none',
                          borderRadius: '4px',
                          padding: '0.35rem 0.75rem',
                          fontSize: '0.8rem',
                          cursor: 'pointer',
                        }}
                      >
                        Cancelar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '0.6rem 0.75rem',
  textAlign: 'left',
  whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  padding: '0.6rem 0.75rem',
  whiteSpace: 'nowrap',
}
