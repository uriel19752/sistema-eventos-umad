import { useEffect, useState } from 'react'
import axios from 'axios'
import { CheckCircle, Star } from 'lucide-react'
import SolicitudCompletaModal from '../components/SolicitudCompletaModal'

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
  horaFin?: string
  horaMontaje?: string
  estado: string
  prioridad: string
  descripcion?: string | null
  objetivoCobertura?: string | null
  publicoObjetivo?: string | null
  autoridadesAsistentes?: string | null
  lugarEspecifico?: string | null
  ubicacion?: string | null
  responsableNombre?: string | null
  contacto?: string | null
  departamentoSolicitante?: string | null
  plantel: Plantel
  institucion: Institucion
}

interface Material {
  id: number
  solicitudId: number
  tipoMaterial: string
  descripcionOtro: string | null
}

interface ConflictoHorario {
  id: number
  nombreEvento: string
  horaInicio: string
  horaFin: string
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

export default function Dashboard({ userRol }: { userRol: string }) {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [filtro, setFiltro] = useState<FiltroInstitucion>('')
  const [tabTemporal, setTabTemporal] = useState('todo')
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<number | null>(null)
  const [materiales, setMateriales] = useState<Material[]>([])
  const [cargandoMateriales, setCargandoMateriales] = useState(false)

  const [encuestas, setEncuestas] = useState<Encuesta[]>([])
  const [promedioEncuesta, setPromedioEncuesta] = useState(0)
  const [nuevaCalificacion, setNuevaCalificacion] = useState(5)
  const [nuevosComentarios, setNuevosComentarios] = useState('')
  const [guardandoEncuesta, setGuardandoEncuesta] = useState(false)
  const [modalCancelacionAbierto, setModalCancelacionAbierto] = useState(false);
  const [idSolicitudACancelar, setIdSolicitudACancelar] = useState<number | null>(null);
  const [motivoCancelacion, setMotivoCancelacion] = useState('');
  const [modalEncuestasDetallado, setModalEncuestasDetallado] = useState(false);
  const [modalSolicitudCompleta, setModalSolicitudCompleta] = useState(false);
  const [modalAprobarAbierto, setModalAprobarAbierto] = useState(false);
  const [modalRechazarAbierto, setModalRechazarAbierto] = useState(false);
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [toast, setToast] = useState<{ mensaje: string; tipo: 'success' | 'error' } | null>(null);
  const [modalConflictoHorario, setModalConflictoHorario] = useState(false);
  const [conflictos, setConflictos] = useState<ConflictoHorario[]>([]);

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
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast])

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

  async function confirmarCancelacion() {
    if (idSolicitudACancelar === null) return;
    try {
      await axios.patch(`/api/solicitudes/${idSolicitudACancelar}/estado`, { 
        estado: 'Cancelada',
        motivo: motivoCancelacion.trim() || null 
      });
      alert("La solicitud ha sido cancelada exitosamente.");

      setModalCancelacionAbierto(false);
      setIdSolicitudACancelar(null);
      setMotivoCancelacion('');
      await cargarSolicitudes();
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error ?? 'Error al cancelar la solicitud' : 'Error de conexión';
      alert(msg);
    }
  }

  async function confirmarAprobacion() {
    if (solicitudSeleccionada === null) return;
    try {
      await axios.patch(`/api/solicitudes/${solicitudSeleccionada}/estado`, {
        estado: 'Aprobado'
      });
      setModalAprobarAbierto(false);
      setToast({ mensaje: 'Solicitud aprobada exitosamente.', tipo: 'success' });
      await cargarSolicitudes();
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.log('[DEBUG CONFLICTO FRONTEND] error.response?.data:', err.response?.data);
      }
      if (axios.isAxiosError(err) && err.response?.status === 409 && err.response?.data?.warning) {
        setConflictos(err.response.data.conflictos ?? []);
        setModalAprobarAbierto(false);
        setModalConflictoHorario(true);
        return;
      }
      const msg = axios.isAxiosError(err) ? err.response?.data?.error ?? 'Error al aprobar la solicitud' : 'Error de conexión';
      setToast({ mensaje: msg, tipo: 'error' });
    }
  }

  async function confirmarAprobacionForzada() {
    if (solicitudSeleccionada === null) return;
    try {
      await axios.patch(`/api/solicitudes/${solicitudSeleccionada}/estado`, {
        estado: 'Aprobado',
        forzar: true,
      });
      setModalConflictoHorario(false);
      setConflictos([]);
      setToast({ mensaje: 'Solicitud aprobada con conflicto horario registrado.', tipo: 'success' });
      await cargarSolicitudes();
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error ?? 'Error al aprobar la solicitud' : 'Error de conexión';
      setToast({ mensaje: msg, tipo: 'error' });
    }
  }

  async function confirmarRechazo() {
    if (solicitudSeleccionada === null) return;
    if (!motivoRechazo.trim()) return;
    try {
      await axios.patch(`/api/solicitudes/${solicitudSeleccionada}/estado`, {
        estado: 'Cancelada',
        motivo: motivoRechazo.trim()
      });
      setModalRechazarAbierto(false);
      setMotivoRechazo('');
      setToast({ mensaje: 'Solicitud rechazada correctamente.', tipo: 'success' });
      await cargarSolicitudes();
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error ?? 'Error al rechazar la solicitud' : 'Error de conexión';
      setToast({ mensaje: msg, tipo: 'error' });
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

    const formatearFecha = (fecha: string) => {
      return fecha.split('T')[0].split('-').reverse().join('/')
    }

    const hoy = new Date()
    const filtradas = solicitudes.filter(s => {
      if (filtro !== '' && !s.institucion?.nombre?.includes(filtro)) return false
      if (tabTemporal === 'mes') {
        const fechaEvento = new Date(s.fechaEvento)
        if (fechaEvento.getMonth() !== hoy.getMonth() || fechaEvento.getFullYear() !== hoy.getFullYear()) return false
      }
      if (tabTemporal === 'proximos') {
        const fechaEvento = new Date(s.fechaEvento)
        if (fechaEvento < hoy || (s.estado !== 'Pendiente' && s.estado !== 'Aprobado')) return false
      }
      return true
    })
    const solicitudActualObj = solicitudSeleccionada
      ? solicitudes.find(s => s.id === solicitudSeleccionada)
      : undefined

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: COLORS.primary }}>Detalles de Solicitud</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: COLORS.primary }}>{promedioEncuesta.toFixed(1)}</div>
                <div>
                  <div style={{ display: 'flex', gap: '2px' }}>{renderEstrellas(Math.round(promedioEncuesta), 16)}</div>
                  <div style={{ fontSize: '0.75rem', color: COLORS.textSecondary }}>Promedio de {encuestas.length} encuestas</div>
                </div>
              </div>
            </div>
            <button 
              onClick={() => setSolicitudSeleccionada(null)} 
              style={{ background: 'none', border: 'none', color: COLORS.textSecondary, cursor: 'pointer', fontSize: '0.9rem' }}
            >
              Cerrar
            </button>
          </div>

          <div style={{ display: 'flex', gap: '1rem', margin: '1rem 0', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
            <button onClick={() => setModalSolicitudCompleta(true)} style={{ padding: '0.6rem 1.2rem', background: COLORS.primary, color: COLORS.white, border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>📄 Ver Solicitud Completa</button>
            <button onClick={() => setModalEncuestasDetallado(true)} style={{ padding: '0.6rem 1.2rem', background: COLORS.accent, color: COLORS.textPrimary, border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem' }}>📊 Ver Contenido de la Encuesta</button>
          </div>

          {userRol === 'ADMIN' && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '12px', padding: '1.25rem', marginTop: '0.5rem' }}>
              <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem', fontWeight: 700, color: COLORS.textPrimary }}>Acciones Administrativas</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.9rem', color: COLORS.textSecondary, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  Estado actual:
                  <span style={{
                    padding: '0.25rem 0.75rem',
                    borderRadius: '4px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    background:
                      solicitudActualObj?.estado === 'Pendiente' ? '#fef3c7' :
                      solicitudActualObj?.estado === 'Aprobado' ? '#dbeafe' :
                      solicitudActualObj?.estado === 'Cancelada' ? '#fee2e2' :
                      '#dcfce7',
                    color:
                      solicitudActualObj?.estado === 'Pendiente' ? '#856404' :
                      solicitudActualObj?.estado === 'Aprobado' ? COLORS.primary :
                      solicitudActualObj?.estado === 'Cancelada' ? COLORS.secondary :
                      '#16a34a',
                  }}>
                    {solicitudActualObj?.estado}
                  </span>
                </span>
                {solicitudActualObj?.estado === 'Pendiente' && (
                  <div style={{ display: 'flex', gap: '0.75rem', marginLeft: 'auto' }}>
                    <button
                      onClick={() => setModalAprobarAbierto(true)}
                      style={{
                        padding: '0.6rem 1.2rem',
                        background: '#16a34a',
                        color: COLORS.white,
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      ✅ Aprobar Solicitud
                    </button>
                    <button
                      onClick={() => setModalRechazarAbierto(true)}
                      style={{
                        padding: '0.6rem 1.2rem',
                        background: COLORS.secondary,
                        color: COLORS.white,
                        border: 'none',
                        borderRadius: '6px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      ❌ Rechazar Solicitud
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

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
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: COLORS.textPrimary, marginBottom: '1rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.5rem' }}>Vista de Administrador</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                <div>
                  <strong>Descripción:</strong>
                  <p style={{ margin: '2px 0 0', color: COLORS.textSecondary }}>{solicitudActualObj?.descripcion || "Sin descripción"}</p>
                </div>
                <div>
                  <strong>Objetivo de Cobertura:</strong>
                  <p style={{ margin: '2px 0 0', color: COLORS.textSecondary }}>{solicitudActualObj?.objetivoCobertura || "Sin objetivo especificado"}</p>
                </div>
                <div>
                  <strong>Público Objetivo:</strong>
                  <p style={{ margin: '2px 0 0', color: COLORS.textSecondary }}>{solicitudActualObj?.publicoObjetivo || "No especificado"}</p>
                </div>
                <div>
                  <strong>Autoridades Asistentes:</strong>
                  <p style={{ margin: '2px 0 0', color: COLORS.textSecondary }}>{solicitudActualObj?.autoridadesAsistentes || "Ninguna registrada"}</p>
                </div>
                <div>
                  <strong>Lugar Específico:</strong>
                  <p style={{ margin: '2px 0 0', color: COLORS.textSecondary }}>{solicitudActualObj?.lugarEspecifico || "No especificado"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ backgroundColor: '#fff3cd', borderLeft: '5px solid #ffc107', color: '#856404', padding: '12px 15px', borderRadius: '6px', fontSize: '0.9rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
        <span>ℹ️</span>
        <p style={{ margin: 0 }}>Si desea cancelar alguna solicitud, favor de hacerlo con un mínimo de 48 horas de anticipación.</p>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.5rem' }}>
        {['todo', 'mes', 'proximos'].map((tab) => (
          <button
            key={tab}
            onClick={() => setTabTemporal(tab)}
            style={{
              padding: '0.5rem 1rem',
              background: tabTemporal === tab ? COLORS.primary : 'transparent',
              color: tabTemporal === tab ? COLORS.white : COLORS.textSecondary,
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              cursor: 'pointer',
              textTransform: 'capitalize',
              fontSize: '0.9rem',
              transition: 'all 0.2s'
            }}
          >
            {tab === 'todo' ? 'Todo' : tab === 'mes' ? 'Este Mes' : 'Próximos Eventos'}
          </button>
        ))}
      </div>
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
                    <td style={tdStyle}>{s.institucion?.nombre || "Externa"}</td>
                    <td style={tdStyle}>{s.plantel?.nombre || (s.lugarEspecifico === "Lugar Externo" ? "Lugar Externo" : "No asignado")}</td>
                  <td style={tdStyle}>{formatearFecha(s.fechaEvento)}</td>
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
                        onClick={() => { setIdSolicitudACancelar(s.id); setModalCancelacionAbierto(true); }}
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

      {modalCancelacionAbierto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(3px)' }}>
          <div style={{ background: COLORS.surface, padding: '2rem', borderRadius: '16px', maxWidth: '400px', width: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 1rem', color: COLORS.secondary, fontSize: '1.2rem', fontWeight: 700 }}>⚠️ Confirmar Cancelación</h3>
            <p style={{ fontSize: '0.9rem', color: COLORS.textPrimary, lineHeight: '1.5', margin: '0 0 1.5rem' }}>
              Recuerde que las cancelaciones deben realizarse con un mínimo de 48 horas de anticipación al evento. ¿Desea continuar de todos modos?
            </p>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: COLORS.textPrimary, marginBottom: '0.5rem' }}>Motivo de la cancelación (Opcional)</label>
            <textarea 
              value={motivoCancelacion}
              onChange={(e) => setMotivoCancelacion(e.target.value)}
              placeholder="Escriba la razón de la cancelación aquí..."
              rows={3}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', marginBottom: '1.5rem', fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => { setModalCancelacionAbierto(false); setIdSolicitudACancelar(null); setMotivoCancelacion(''); }} style={{ flex: 1, padding: '0.6rem', background: '#e2e8f0', color: COLORS.textPrimary, border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Atrás</button>
              <button onClick={confirmarCancelacion} style={{ flex: 1, padding: '0.6rem', background: COLORS.secondary, color: COLORS.white, border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Sí, cancelar</button>
            </div>
          </div>
        </div>
      )}

      {modalEncuestasDetallado && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, backdropFilter: 'blur(3px)' }}>
          <div style={{ background: COLORS.surface, padding: '2rem', borderRadius: '16px', maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0, color: COLORS.primary, fontWeight: 700 }}>📋 Historial Detallado de Encuestas</h3>
              <button onClick={() => setModalEncuestasDetallado(false)} style={{ background: '#f1f5f9', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>Cerrar</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {encuestas.map(e => (
                <div key={e.id} style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', borderLeft: `4px solid ${COLORS.accent}` }}>
                  <div style={{ marginBottom: '0.5rem' }}>{renderEstrellas(e.calificacion, 14)}</div>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: COLORS.textPrimary, lineHeight: '1.4' }}>{e.comentarios || "Sin comentarios adicionales."}</p>
                  <span style={{ fontSize: '0.75rem', color: COLORS.textSecondary }}>Respondido el: {formatearFecha(e.fechaRespuesta)}</span>
                </div>
              ))}
              {encuestas.length === 0 && <p style={{ textAlign: 'center', color: COLORS.textSecondary, fontSize: '0.9rem' }}>ℹ️ Aún no se han recibido evaluaciones para este evento.</p>}
            </div>
          </div>
        </div>
      )}

      {modalAprobarAbierto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(3px)' }}>
          <div style={{ background: COLORS.surface, padding: '2rem', borderRadius: '16px', maxWidth: '450px', width: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 1rem', color: '#16a34a', fontSize: '1.2rem', fontWeight: 700 }}>✅ Confirmar Aprobación</h3>
            <p style={{ fontSize: '0.9rem', color: COLORS.textPrimary, lineHeight: '1.5', margin: '0 0 1.5rem' }}>
              ¿Desea aprobar esta solicitud?
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => setModalAprobarAbierto(false)} style={{ flex: 1, padding: '0.6rem', background: '#e2e8f0', color: COLORS.textPrimary, border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={confirmarAprobacion} style={{ flex: 1, padding: '0.6rem', background: '#16a34a', color: COLORS.white, border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Sí, aprobar</button>
            </div>
          </div>
        </div>
      )}

      {modalRechazarAbierto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(3px)' }}>
          <div style={{ background: COLORS.surface, padding: '2rem', borderRadius: '16px', maxWidth: '450px', width: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 1rem', color: COLORS.secondary, fontSize: '1.2rem', fontWeight: 700 }}>❌ Confirmar Rechazo</h3>
            <p style={{ fontSize: '0.9rem', color: COLORS.textPrimary, lineHeight: '1.5', margin: '0 0 1rem' }}>
              ¿Está seguro de rechazar esta solicitud? Proporcione el motivo del rechazo.
            </p>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: COLORS.textPrimary, marginBottom: '0.5rem' }}>Motivo del rechazo *</label>
            <textarea
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              placeholder="Escriba el motivo del rechazo..."
              rows={3}
              style={{ width: '100%', padding: '0.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', marginBottom: '1.5rem', fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button onClick={() => { setModalRechazarAbierto(false); setMotivoRechazo(''); }} style={{ flex: 1, padding: '0.6rem', background: '#e2e8f0', color: COLORS.textPrimary, border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}>Atrás</button>
              <button
                onClick={confirmarRechazo}
                disabled={!motivoRechazo.trim()}
                style={{
                  flex: 1,
                  padding: '0.6rem',
                  background: motivoRechazo.trim() ? COLORS.secondary : '#94a3b8',
                  color: COLORS.white,
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: motivoRechazo.trim() ? 'pointer' : 'not-allowed',
                }}
              >
                Sí, rechazar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalConflictoHorario && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2500, backdropFilter: 'blur(3px)' }}>
          <div style={{ background: COLORS.surface, padding: '2rem', borderRadius: '16px', maxWidth: '500px', width: '90%', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
            <h3 style={{ margin: '0 0 0.5rem', color: '#d97706', fontSize: '1.2rem', fontWeight: 700 }}>⚠️ Conflicto de Horario Detectado</h3>
            <p style={{ fontSize: '0.9rem', color: COLORS.textPrimary, lineHeight: '1.5', margin: '0 0 1rem' }}>
              Se detectaron eventos aprobados en el mismo horario y plantel.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {conflictos.map((c) => (
                <div key={c.id} style={{ padding: '0.75rem 1rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', borderLeft: '4px solid #f59e0b' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: COLORS.textPrimary }}>{c.nombreEvento}</div>
                  <div style={{ fontSize: '0.8rem', color: COLORS.textSecondary, marginTop: '0.25rem' }}>
                    {c.horaInicio} — {c.horaFin}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => { setModalConflictoHorario(false); setConflictos([]); }}
                style={{ flex: 1, padding: '0.6rem', background: '#e2e8f0', color: COLORS.textPrimary, border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarAprobacionForzada}
                style={{ flex: 1, padding: '0.6rem', background: '#d97706', color: COLORS.white, border: 'none', borderRadius: '6px', fontWeight: 600, cursor: 'pointer' }}
              >
                Aprobar de todas formas
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          zIndex: 9999,
          padding: '0.85rem 1.25rem',
          borderRadius: '8px',
          background: toast.tipo === 'success' ? '#16a34a' : '#dc2626',
          color: '#ffffff',
          fontWeight: 600,
          fontSize: '0.9rem',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          maxWidth: '400px',
        }}>
          {toast.tipo === 'success' ? '✅' : '❌'} {toast.mensaje}
        </div>
      )}

      <SolicitudCompletaModal
        open={modalSolicitudCompleta}
        onClose={() => setModalSolicitudCompleta(false)}
        solicitud={solicitudActualObj ?? null}
        materiales={materiales}
        userRol={userRol}
      />
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
