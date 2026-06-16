import { useEffect, useState } from 'react'
import axios from 'axios'
import { Calendar, AlertTriangle, CheckCircle, Star } from 'lucide-react'

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

export default function Dashboard() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filtro, setFiltro] = useState<FiltroInstitucion>('')
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<number | null>(null)
  const [materiales, setMateriales] = useState<Material[]>([])
  const [cargandoMateriales, setCargandoMateriales] = useState(false)

  const [encuestas, setEncuestas] = useState<Encuesta[]>([])
  const [promedioEncuesta, setPromedioEncuesta] = useState(0)
  const [distribucion, setDistribucion] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 })
  const [cargandoEncuestas, setCargandoEncuestas] = useState(false)

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
      setError('Error al cargar las solicitudes')
    } finally {
      setLoading(false)
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
        setDistribucion({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 })
        return
      }
      setCargandoEncuestas(true)
      try {
        const res = await axios.get(`/api/encuestas/solicitud/${solicitudSeleccionada}`)
        setEncuestas(res.data.encuestas)
        setPromedioEncuesta(res.data.promedio)
        setDistribucion(res.data.distribucion)
      } catch {
        setEncuestas([])
        setPromedioEncuesta(0)
        setDistribucion({ 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 })
      } finally {
        setCargandoEncuestas(false)
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
      setDistribucion(res.data.distribucion)
      setNuevaCalificacion(5)
      setNuevosComentarios('')
      await cargarResumenGlobal()
    } catch {
      alert('Error al guardar la evaluación')
    } finally {
      setGuardandoEncuesta(false)
    }
  }

  const filtradas = filtro
    ? solicitudes.filter((s) => s.institucion.nombre === filtro)
    : solicitudes

  const maxDistribucion = Math.max(...Object.values(distribucion), 1)

  function renderEstrellas(cal: number, size = 18) {
    return (
      <span style={{ color: '#f59e0b', fontSize: size, letterSpacing: 2 }}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span key={i}>{i <= cal ? '★' : '☆'}</span>
        ))}
      </span>
    )
  }

  return (
    <div style={{ maxWidth: 960, margin: '2rem auto', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h1 style={{ color: '#1e3a5f', margin: 0 }}>Dashboard</h1>

        <select
          value={filtro}
          onChange={(e) => setFiltro(e.target.value as FiltroInstitucion)}
          style={{ padding: '0.4rem', borderRadius: 4, border: '1px solid #ccc' }}
        >
          <option value="">Todas las instituciones</option>
          <option value="UMAD">UMAD</option>
          <option value="IMM">IMM</option>
        </select>
      </div>

      {!loading && !error && (
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 140, background: '#eef4ff', borderRadius: 8, padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Calendar size={28} color="#1e3a5f" />
            <div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#555', textTransform: 'uppercase', letterSpacing: 1 }}>Total Eventos</p>
              <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#1e3a5f' }}>{filtradas.length}</p>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 140, background: '#fef2f2', borderRadius: 8, padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <AlertTriangle size={28} color="#dc2626" />
            <div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#555', textTransform: 'uppercase', letterSpacing: 1 }}>Cancelados</p>
              <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#dc2626' }}>{filtradas.filter((s) => s.estado === 'Cancelada').length}</p>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 140, background: '#f0fdf4', borderRadius: 8, padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <CheckCircle size={28} color="#16a34a" />
            <div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#555', textTransform: 'uppercase', letterSpacing: 1 }}>Eficiencia</p>
              <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#16a34a' }}>
                {filtradas.length === 0
                  ? '—'
                  : `${Math.round(((filtradas.length - filtradas.filter((s) => s.estado === 'Cancelada').length) / filtradas.length) * 100)}%`
                }
              </p>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 140, background: '#fffbeb', borderRadius: 8, padding: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Star size={28} color="#d97706" />
            <div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#555', textTransform: 'uppercase', letterSpacing: 1 }}>Satisfacción</p>
              <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: '#d97706' }}>
                {totalEncuestasGlobal === 0 ? '—' : `${promedioGlobal.toFixed(1)} ★`}
              </p>
            </div>
          </div>
        </div>
      )}

      {loading && <p style={{ color: '#555' }}>Cargando solicitudes...</p>}
      {error && <p style={{ color: '#721c24', background: '#f8d7da', padding: '0.75rem', borderRadius: 6 }}>{error}</p>}

      {!loading && !error && filtradas.length === 0 && (
        <p style={{ color: '#555' }}>No hay solicitudes registradas.</p>
      )}

      {solicitudSeleccionada !== null && (
        <div style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Materiales */}
          <div style={{ padding: '1rem', background: '#f8f9fa', borderRadius: 8 }}>
            <h3 style={{ margin: '0 0 0.75rem', color: '#1e3a5f' }}>
              Materiales de la solicitud #{solicitudSeleccionada}
            </h3>
            {cargandoMateriales && <p style={{ color: '#555' }}>Cargando materiales...</p>}
            {!cargandoMateriales && materiales.length === 0 && (
              <p style={{ color: '#555' }}>Esta solicitud no tiene materiales registrados.</p>
            )}
            {!cargandoMateriales && materiales.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                <thead>
                  <tr style={{ background: '#1e3a5f', color: '#fff' }}>
                    <th style={thStyle}>Tipo</th>
                    <th style={thStyle}>Descripción</th>
                  </tr>
                </thead>
                <tbody>
                  {materiales.map((m) => (
                    <tr key={m.id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                      <td style={tdStyle}>{m.tipoMaterial}</td>
                      <td style={tdStyle}>{m.descripcionOtro ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Evaluación */}
          <div style={{
            padding: '1.25rem',
            background: '#0f172a',
            borderRadius: 8,
            color: '#e2e8f0',
          }}>
            <h3 style={{ margin: '0 0 1rem', color: '#f1f5f9', fontSize: '1rem' }}>
              Evaluación y Encuesta Post-Evento
            </h3>

            {cargandoEncuestas && <p style={{ color: '#94a3b8' }}>Cargando evaluaciones...</p>}

            {!cargandoEncuestas && encuestas.length === 0 && (
              <div>
                <p style={{ color: '#94a3b8', marginBottom: '1rem', fontSize: '0.85rem' }}>
                  No hay evaluaciones registradas para este evento.
                </p>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: '0.85rem', color: '#cbd5e1' }}>
                    Calificación (1–5)
                  </label>
                  <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                    {[1, 2, 3, 4, 5].map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setNuevaCalificacion(v)}
                        style={{
                          width: 36,
                          height: 36,
                          border: nuevaCalificacion === v ? '2px solid #f59e0b' : '2px solid #475569',
                          borderRadius: 6,
                          background: nuevaCalificacion === v ? '#1e293b' : 'transparent',
                          color: nuevaCalificacion >= v ? '#f59e0b' : '#475569',
                          fontSize: '1.1rem',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom: '0.75rem' }}>
                  <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: '0.85rem', color: '#cbd5e1' }}>
                    Comentarios / Retroalimentación
                  </label>
                  <textarea
                    value={nuevosComentarios}
                    onChange={(e) => setNuevosComentarios(e.target.value)}
                    rows={3}
                    placeholder="Escribe tus comentarios aquí..."
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: 4,
                      border: '1px solid #334155',
                      background: '#1e293b',
                      color: '#e2e8f0',
                      resize: 'vertical',
                      fontFamily: 'inherit',
                      fontSize: '0.85rem',
                    }}
                  />
                </div>
                <button
                  onClick={guardarEncuesta}
                  disabled={guardandoEncuesta}
                  style={{
                    padding: '0.55rem 1.25rem',
                    background: guardandoEncuesta ? '#475569' : '#f59e0b',
                    color: '#0f172a',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: guardandoEncuesta ? 'not-allowed' : 'pointer',
                  }}
                >
                  {guardandoEncuesta ? 'Guardando...' : 'Guardar Evaluación'}
                </button>
              </div>
            )}

            {!cargandoEncuestas && encuestas.length > 0 && (
              <div>
                {/* Promedio general */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  marginBottom: '1.25rem',
                  padding: '0.75rem 1rem',
                  background: '#1e293b',
                  borderRadius: 6,
                }}>
                  <div style={{ fontSize: '2rem', fontWeight: 700, color: '#f59e0b' }}>
                    {promedioEncuesta.toFixed(1)}
                  </div>
                  <div>
                    <div style={{ fontSize: '1.25rem' }}>{renderEstrellas(Math.round(promedioEncuesta), 22)}</div>
                    <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>
                      {encuestas.length} evaluación{encuestas.length !== 1 ? 'es' : ''}
                    </p>
                  </div>
                </div>

                {/* Barras de progreso por calificación */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>
                    Distribución de calificaciones
                  </p>
                  {[5, 4, 3, 2, 1].map((nivel) => {
                    const count = distribucion[nivel] ?? 0
                    const pct = Math.round((count / encuestas.length) * 100)
                    return (
                      <div key={nivel} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                        <span style={{ width: 20, fontSize: '0.8rem', color: '#94a3b8', textAlign: 'right' }}>{nivel}</span>
                        <div style={{
                          flex: 1,
                          height: 10,
                          background: '#1e293b',
                          borderRadius: 5,
                          overflow: 'hidden',
                        }}>
                          <div style={{
                            width: `${pct}%`,
                            height: '100%',
                            background: nivel >= 4 ? '#22c55e' : nivel >= 3 ? '#eab308' : '#ef4444',
                            borderRadius: 5,
                            transition: 'width 0.3s ease',
                          }} />
                        </div>
                        <span style={{ width: 30, fontSize: '0.75rem', color: '#94a3b8', textAlign: 'right' }}>{count}</span>
                      </div>
                    )
                  })}
                </div>

                {/* Comentarios */}
                <div>
                  <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>
                    Comentarios de asistentes ({encuestas.filter((e) => e.comentarios).length})
                  </p>
                  {encuestas.filter((e) => e.comentarios).length === 0 && (
                    <p style={{ color: '#64748b', fontSize: '0.85rem', fontStyle: 'italic' }}>
                      Sin comentarios registrados.
                    </p>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {encuestas
                      .filter((e) => e.comentarios)
                      .map((e) => (
                        <div key={e.id} style={{
                          padding: '0.6rem 0.75rem',
                          background: '#1e293b',
                          borderRadius: 6,
                          borderLeft: '3px solid #f59e0b',
                        }}>
                          <div style={{ marginBottom: '0.2rem' }}>{renderEstrellas(e.calificacion, 14)}</div>
                          <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.4 }}>
                            {e.comentarios}
                          </p>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {filtradas.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ background: '#1e3a5f', color: '#fff' }}>
                <th style={thStyle}>Folio</th>
                <th style={thStyle}>Evento</th>
                <th style={thStyle}>Institución</th>
                <th style={thStyle}>Plantel</th>
                <th style={thStyle}>Fecha</th>
                <th style={thStyle}>Estado</th>
                <th style={thStyle}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtradas.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid #e0e0e0' }}>
                  <td style={tdStyle}>{s.folio}</td>
                  <td style={tdStyle}>
                    <button
                      onClick={() => setSolicitudSeleccionada(s.id)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#1e3a5f',
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
                        borderRadius: 4,
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        background:
                          s.estado === 'Cancelada' ? '#f8d7da' :
                          s.estado === 'Completada' ? '#d4edda' :
                          s.estado === 'Aprobado' ? '#cce5ff' :
                          '#fff3cd',
                        color:
                          s.estado === 'Cancelada' ? '#721c24' :
                          s.estado === 'Completada' ? '#155724' :
                          s.estado === 'Aprobado' ? '#004085' :
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
                          background: '#dc3545',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 4,
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
