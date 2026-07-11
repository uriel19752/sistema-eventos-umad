import { useEffect, useState, startTransition } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { Search, CheckCircle, Star, Layers, FileText, AlertTriangle, XCircle, Info, BarChart3, User, Calendar, X, Activity, Clock, ClipboardList } from 'lucide-react'
import SolicitudCompletaModal from '../components/SolicitudCompletaModal'
import NotificationBell from '../components/NotificationBell'
import SatisfaccionCalidad, { type PromediosEncuesta } from '../components/SatisfaccionCalidad'
import umadLogo from '../assets/logos/umad_logo.png'
import prepaUmadLogo from '../assets/logos/prepa_umad_logo.png'
import immLogo from '../assets/logos/imm_logo.png'

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
  satisfaccionGral: number
  comentarios: string | null
  fechaRespuesta: string
}

type FiltroInstitucion = '' | 'UMAD' | 'Prepa UMAD' | 'IMM' | 'IMM Secundaria' | 'IMM Primaria' | 'IMM Maternal' | 'Ingenierías' | 'Arte y Humanidades' | 'Negocios, Comercio y Derecho' | 'Ciencias Sociales'

const STATUS_CONFIG: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
  Pendiente: { bg: '#F59E0B', color: '#FFFFFF', icon: <Clock size={14} /> },
  Aprobado: { bg: '#1E3A8A', color: '#FFFFFF', icon: <CheckCircle size={14} /> },
  Completada: { bg: '#16A34A', color: '#FFFFFF', icon: <Activity size={14} /> },
  Cancelada: { bg: '#DC2626', color: '#FFFFFF', icon: <XCircle size={14} /> },
}

function getStatusCfg(estado: string) {
  return STATUS_CONFIG[estado] ?? { bg: '#64748B', color: '#FFFFFF', icon: <Clock size={14} /> }
}

const KPI_CARDS = [
  { label: 'Total Solicitudes', key: 'total', icon: Layers, color: '#2563EB', bgLight: 'rgba(37,99,235,0.08)' },
] as const

export default function Dashboard({ userRol, onCambioInstitucion, solicitudIdFromRoute }: { userRol: string; onCambioInstitucion?: (inst: 'umad' | 'prepa' | 'imm' | 'sistema') => void; solicitudIdFromRoute?: number }) {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([])
  const [filtro, setFiltro] = useState<FiltroInstitucion>('')
  const [tabTemporal, setTabTemporal] = useState('todo')
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('TODOS')
  const [filtroPlantel, setFiltroPlantel] = useState('TODOS')
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<number | null>(null)
  const [materiales, setMateriales] = useState<Material[]>([])
  const [cargandoMateriales, setCargandoMateriales] = useState(false)

  const [encuestas, setEncuestas] = useState<Encuesta[]>([])
  const [promedioEncuesta, setPromedioEncuesta] = useState(0)
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

  const [, setPromedioGlobal] = useState(0)
  const [, setTotalEncuestasGlobal] = useState(0)
  const [promediosEncuesta, setPromediosEncuesta] = useState<PromediosEncuesta | null>(null)

  async function cargarSolicitudes() {
    try {
      const res = await axios.get('/api/solicitudes')
      setSolicitudes(res.data)
    } catch {
      // Fail silently
    }
  }

  async function cargarResumenGlobal() {
    try {
      const res = await axios.get('/api/encuestas/global')
      setPromedioGlobal(res.data.promedioGlobal)
      setTotalEncuestasGlobal(res.data.totalEncuestas)
    } catch {
      // Fail silently
    }
  }

  async function cargarPromediosEncuesta() {
    try {
      const res = await axios.get('/api/estadisticas/dashboard')
      if (res.data.promediosEncuesta) {
        setPromediosEncuesta(res.data.promediosEncuesta)
      }
    } catch {
      // Fail silently
    }
  }

  useEffect(() => {
    startTransition(() => {
      cargarSolicitudes()
      cargarResumenGlobal()
      cargarPromediosEncuesta()
    })
  }, [])

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
      onCambioInstitucion(mapa[filtro] ?? 'sistema')
    }
  }, [filtro, onCambioInstitucion])

  /**
   * Efecto de auto-selección por query param `?solicitudId=<id>`.
   *
   * Flujo de deep linking desde enlaces de correo:
   * 1. El usuario hace clic en un enlace como
   *    `https://app/solicitudes/detalle?id=42` (véase `DetalleRedirect` en
   *    `App.tsx`), que redirige a `/dashboard/solicitud/42`.
   * 2. `AppContent` captura `:id` con `useParams`, lo pasa como prop
   *    `solicitudIdFromRoute` a `<Dashboard>`, y también lo deja como
   *    query param `?solicitudId=<id>` en la URL.
   * 3. Este efecto lee `?solicitudId` de la URL actual mediante
   *    `useSearchParams()` y, cuando las solicitudes ya se cargaron,
   *    busca si el ID existe en la lista.
   * 4. Si existe, establece `solicitudSeleccionada` (que abre el panel
   *    de detalle en la interfaz) y hace scroll suave al panel.
   * 5. Si el ID no existe (solicitud eliminada o acceso inválido),
   *    simplemente no se selecciona nada — no hay error.
   *
   * Dependencias: `[searchParams, solicitudes]` — se re-ejecuta cuando
   * cambia la URL o cuando el listado termina de cargar.
   */
  useEffect(() => {
    const solicitudIdParam = searchParams.get('solicitudId')
    if (solicitudIdParam && solicitudes.length > 0) {
      const id = Number(solicitudIdParam)
      if (!isNaN(id) && solicitudes.some(s => s.id === id)) {
        setSolicitudSeleccionada(id)
        document.getElementById('panel-detalle')?.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }, [searchParams, solicitudes])

  /**
   * Efecto de auto-apertura del modal de detalles completo cuando se navega
   * directamente a `/dashboard/solicitud/:id`.
   *
   * Flujo de deep linking con modal completo:
   * 1. Tras la redirección desde `DetalleRedirect`, la URL queda
   *    `/dashboard/solicitud/42` y `AppContent` pasa `solicitudIdFromRoute = 42`
   *    como prop al Dashboard.
   * 2. Este efecto difiere del anterior en que NO solo selecciona la solicitud
   *    (panel de detalle), sino que además ABRE el modal de solicitud completa
   *    (`setModalSolicitudCompleta(true)`). Esto replica la experiencia de que
   *    el usuario hubiera hecho clic en "Ver Solicitud Completa" manualmente.
   * 3. La guarda `solicitudes.some(s => s.id === solicitudIdFromRoute)` evita
   *    abrir el modal para IDs inexistentes.
   *
   * Separación de efectos:
   * - El efecto de `searchParams` maneja el panel lateral de detalle (cuando el
   *   query param está presente en la URL actual).
   * - Este efecto maneja el modal completo (cuando la ruta incluye `:id` como
   *   segmento de path, proveniente de un enlace de correo).
   * Ambos pueden dispararse en la misma navegación, resultando en panel de
   *   detalle + modal abierto simultáneamente (comportamiento esperado).
   *
   * Dependencias: `[solicitudIdFromRoute, solicitudes]`.
   */
  useEffect(() => {
    if (solicitudIdFromRoute && solicitudes.length > 0) {
      if (solicitudes.some(s => s.id === solicitudIdFromRoute)) {
        setSolicitudSeleccionada(solicitudIdFromRoute)
        setModalSolicitudCompleta(true)
      }
    }
  }, [solicitudIdFromRoute, solicitudes])

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
        setPromedioEncuesta(res.data.promedioGlobal)
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
      setToast({ mensaje: 'Solicitud cancelada exitosamente.', tipo: 'success' });

      setModalCancelacionAbierto(false);
      setIdSolicitudACancelar(null);
      setMotivoCancelacion('');
      await cargarSolicitudes();
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error ?? 'Error al cancelar la solicitud' : 'Error de conexion';
      setToast({ mensaje: msg, tipo: 'error' });
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
      const msg = axios.isAxiosError(err) ? err.response?.data?.error ?? 'Error al aprobar la solicitud' : 'Error de conexion';
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
      const msg = axios.isAxiosError(err) ? err.response?.data?.error ?? 'Error al aprobar la solicitud' : 'Error de conexion';
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
      const msg = axios.isAxiosError(err) ? err.response?.data?.error ?? 'Error al rechazar la solicitud' : 'Error de conexion';
      setToast({ mensaje: msg, tipo: 'error' });
    }
  }

  const renderEstrellas = (rating: number, size: number) => {
    return (
      <div style={{ display: 'flex', gap: '2px' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={size}
            fill={star <= rating ? '#F59E0B' : 'transparent'}
            color={star <= rating ? '#F59E0B' : '#CBD5E1'}
          />
        ))}
      </div>
    )
  }

    const formatearFecha = (fecha: string) => {
      return fecha.split('T')[0].split('-').reverse().join('/')
    }

    const hoy = new Date()
    const plantelesUnicos = [...new Map(solicitudes.filter(s => s?.plantel?.id).map(s => [s.plantel.id, s.plantel])).values()]

    const filtradas = solicitudes.filter(s => {
      if (filtro !== '' && !s?.institucion?.nombre?.includes(filtro) && !(s as unknown as Record<string, string | undefined>)?.institucionPersonalizada?.includes(filtro) && !s?.departamentoSolicitante?.includes(filtro)) return false
      if (tabTemporal === 'mes') {
        const fechaEvento = new Date(s?.fechaEvento ?? '')
        if (isNaN(fechaEvento.getTime()) || fechaEvento.getMonth() !== hoy.getMonth() || fechaEvento.getFullYear() !== hoy.getFullYear()) return false
      }
      if (tabTemporal === 'proximos') {
        const fechaEvento = new Date(s?.fechaEvento ?? '')
        if (isNaN(fechaEvento.getTime()) || fechaEvento < hoy || (s.estado !== 'Pendiente' && s.estado !== 'Aprobado')) return false
      }
      if (busqueda.trim()) {
        const q = busqueda.trim().toLowerCase()
        if (!(s?.nombreEvento ?? '').toLowerCase().includes(q) && !(s?.folio ?? '').toLowerCase().includes(q)) return false
      }
      if (filtroEstado !== 'TODOS' && s?.estado !== filtroEstado) return false
      if (filtroPlantel !== 'TODOS' && String(s?.plantel?.id ?? '') !== filtroPlantel) return false
      return true
    })
    const solicitudActualObj = solicitudSeleccionada
      ? solicitudes.find(s => s.id === solicitudSeleccionada)
      : undefined

    const dateStr = hoy.toLocaleDateString('es-MX', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    })

    const KPI_VALUES = {
      total: solicitudes.length,
    }

    const pendientes = solicitudes.filter(s => s?.estado === 'Pendiente').length
    const aprobadas = solicitudes.filter(s => s?.estado === 'Aprobado').length
    const completadas = solicitudes.filter(s => s?.estado === 'Completada').length
    const canceladas = solicitudes.filter(s => s?.estado === 'Cancelada').length

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '1.75rem',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    }}>

      {/* ===== HEADER — Floating card ===== */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
        padding: '1.5rem 2rem',
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.25rem' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#E11D48', display: 'inline-block' }} />
            TigreTrack
          </div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>Dashboard Administrativo</h1>
        </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#64748B', fontWeight: 500, background: '#F8FAFC', padding: '0.4rem 0.9rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <Calendar size={14} color="#64748B" />
              {dateStr.charAt(0).toUpperCase() + dateStr.slice(1)}
            </div>
            <NotificationBell />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: '#64748B', fontWeight: 500, background: '#F8FAFC', padding: '0.4rem 0.9rem', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
              <User size={14} color="#64748B" />
              {userRol}
            </div>
          </div>
      </div>

      {/* ===== INSTITUTION LOGOS + RED BADGE ===== */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{
          border: '1.5px solid #DC2626',
          borderRadius: '10px',
          padding: '0.55rem 1.5rem',
          background: 'rgba(220, 38, 38, 0.04)',
          fontWeight: 700,
          color: '#DC2626',
          fontSize: '0.82rem',
          letterSpacing: '0.02em',
        }}>
          Seccion para la Gestion y Auditoria de Solicitudes de Cobertura
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: '#FFFFFF',
          padding: '0.5rem 1.5rem',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
          gap: 0,
          boxSizing: 'border-box',
          transition: 'all 0.2s ease',
        }}>
          {[
            { src: umadLogo, alt: 'UMAD' },
            { src: prepaUmadLogo, alt: 'Prepa UMAD' },
            { src: immLogo, alt: 'IMM' },
          ].map((logo, idx) => (
            <div key={logo.alt} style={{ display: 'flex', alignItems: 'center' }}>
              {idx > 0 && <div style={{ width: '1px', height: '26px', background: '#E2E8F0', marginRight: '1.25rem' }} />}
              <div style={idx > 0 ? { marginLeft: '1.25rem', width: '90px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' } : { width: '90px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={logo.src} alt={logo.alt} style={{ height: '100%', width: '100%', objectFit: 'contain', display: 'block' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ===== KPI CARDS ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
        {KPI_CARDS.map((card) => {
          const IconComp = card.icon
          return (
            <div
              key={card.key}
              style={{
                background: '#FFFFFF',
                padding: '1.25rem 1.5rem',
                borderRadius: '14px',
                border: '1px solid #E2E8F0',
                boxShadow: '0 1px 3px rgba(15,23,42,0.04), 0 1px 2px rgba(15,23,42,0.02)',
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
                transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                cursor: 'default',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 25px -6px rgba(15,23,42,0.08), 0 4px 8px -4px rgba(15,23,42,0.04)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(15,23,42,0.04), 0 1px 2px rgba(15,23,42,0.02)' }}
            >
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: card.bgLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <IconComp size={22} color={card.color} />
              </div>
              <div>
                <div style={{ color: '#64748B', fontSize: '0.72rem', fontWeight: 600, marginBottom: '0.15rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{card.label}</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.15 }}>{KPI_VALUES[card.key]}</div>
              </div>
            </div>
          )
        })}
        {/* STATUS BREAKDOWN CARDS */}
        {[
          { label: 'Pendientes', value: pendientes, color: '#F59E0B', bgLight: 'rgba(245,158,11,0.08)', icon: Clock },
          { label: 'Aprobadas', value: aprobadas, color: '#1E3A8A', bgLight: 'rgba(30,58,138,0.08)', icon: CheckCircle },
          { label: 'Completadas', value: completadas, color: '#16A34A', bgLight: 'rgba(22,163,74,0.08)', icon: Activity },
          { label: 'Canceladas', value: canceladas, color: '#DC2626', bgLight: 'rgba(220,38,38,0.08)', icon: XCircle },
        ].map((card) => {
          const IconComp = card.icon
          return (
            <div
              key={card.label}
              style={{
                background: '#FFFFFF',
                padding: '1.25rem 1.5rem',
                borderRadius: '14px',
                border: '1px solid #E2E8F0',
                borderLeft: '4px solid ' + card.color,
                boxShadow: '0 1px 3px rgba(15,23,42,0.04), 0 1px 2px rgba(15,23,42,0.02)',
                display: 'flex',
                alignItems: 'center',
                gap: '1.25rem',
                transition: 'all 0.25s cubic-bezier(0.4,0,0.2,1)',
                cursor: 'default',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 8px 25px -6px rgba(15,23,42,0.08), 0 4px 8px -4px rgba(15,23,42,0.04)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 3px rgba(15,23,42,0.04), 0 1px 2px rgba(15,23,42,0.02)' }}
            >
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: card.bgLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <IconComp size={22} color={card.color} />
              </div>
              <div>
                <div style={{ color: '#64748B', fontSize: '0.72rem', fontWeight: 600, marginBottom: '0.15rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{card.label}</div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0F172A', lineHeight: 1.15 }}>{card.value}</div>
              </div>
            </div>
          )
        })}
      </div>

      {promediosEncuesta && (
        <SatisfaccionCalidad data={promediosEncuesta} />
      )}

      {/* ===== FILTERS & CONTROLS ===== */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', letterSpacing: '-0.02em' }}>Gestion de Solicitudes</h2>

          <div style={{ position: 'relative', minWidth: '280px' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Buscar por nombre o folio..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 1rem 0.5rem 2.25rem',
                borderRadius: '10px',
                border: '1px solid #E2E8F0',
                fontSize: '0.85rem',
                fontWeight: 500,
                color: '#0F172A',
                background: '#FFFFFF',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'border-color 0.15s ease, boxShadow 0.15s ease',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#1E3A8A'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30,58,138,0.08)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
          <select
            value={filtro}
            onChange={(e) => setFiltro(e.target.value as FiltroInstitucion)}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              fontSize: '0.82rem',
              fontWeight: 500,
              color: '#0F172A',
              background: '#FFFFFF',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="">Todas las Instituciones</option>
            <option value="UMAD">UMAD</option>
            <option value="Prepa UMAD">Prepa UMAD</option>
            <option value="IMM">IMM (Todas)</option>
            <option value="IMM Secundaria">IMM Secundaria</option>
            <option value="IMM Primaria">IMM Primaria</option>
            <option value="IMM Maternal">IMM Maternal</option>
            <option disabled style={{ fontSize: '0.65rem', fontStyle: 'italic' }}>— Divisiones UMAD —</option>
            <option value="Ingenierías">Ingenierías</option>
            <option value="Arte y Humanidades">Arte y Humanidades</option>
            <option value="Negocios, Comercio y Derecho">Negocios, Comercio y Derecho</option>
            <option value="Ciencias Sociales">Ciencias Sociales</option>
          </select>

          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              fontSize: '0.82rem',
              fontWeight: 500,
              color: '#0F172A',
              background: '#FFFFFF',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="TODOS">Todos los Estados</option>
            {Object.keys(STATUS_CONFIG).map((est) => (
              <option key={est} value={est}>{est}</option>
            ))}
          </select>

          <select
            value={filtroPlantel}
            onChange={(e) => setFiltroPlantel(e.target.value)}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid #E2E8F0',
              fontSize: '0.82rem',
              fontWeight: 500,
              color: '#0F172A',
              background: '#FFFFFF',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            <option value="TODOS">Todos los Planteles</option>
            {plantelesUnicos.map((p) => (
              <option key={p.id} value={String(p.id)}>{p.nombre}</option>
            ))}
          </select>
        </div>

        {/* PILLS */}
        <div style={{ display: 'flex', gap: '0.35rem', padding: '0.25rem', background: '#F1F5F9', borderRadius: '9999px', alignSelf: 'flex-start' }}>
          {['todo', 'mes', 'proximos'].map((tab) => (
            <button
              key={tab}
              onClick={() => setTabTemporal(tab)}
              style={{
                padding: '0.45rem 1.25rem',
                background: tabTemporal === tab ? '#1E3A8A' : 'transparent',
                color: tabTemporal === tab ? '#FFFFFF' : '#64748B',
                border: 'none',
                borderRadius: '9999px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.82rem',
                boxShadow: tabTemporal === tab ? '0 2px 8px rgba(30,58,138,0.25)' : 'none',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => { if (tabTemporal !== tab) { e.currentTarget.style.color = '#DC2626'; e.currentTarget.style.background = 'rgba(220,38,38,0.06)'; } }}
              onMouseLeave={(e) => { if (tabTemporal !== tab) { e.currentTarget.style.color = '#64748B'; e.currentTarget.style.background = 'transparent'; } }}
            >
              {tab === 'todo' ? 'Todo' : tab === 'mes' ? 'Este Mes' : 'Proximos Eventos'}
            </button>
          ))}
        </div>

        {/* AUDIT BANNER */}
        <div style={{
          background: 'rgba(37,99,235,0.03)',
          border: '1px solid rgba(37,99,235,0.1)',
          borderLeft: '4px solid #1E3A8A',
          borderRadius: '10px',
          padding: '0.85rem 1.25rem',
          fontSize: '0.85rem',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          color: '#1E3A8A',
        }}>
          <Info size={18} color="#1E3A8A" style={{ flexShrink: 0 }} />
          <p style={{ margin: 0, lineHeight: 1.5 }}>
            Si desea cancelar alguna solicitud, favor de hacerlo con un minimo de 48 horas de anticipacion.
          </p>
        </div>
      </div>

      {/* ===== DETAIL PANEL ===== */}
      {solicitudSeleccionada !== null && (
        <div id="panel-detalle" style={{
          background: '#FFFFFF',
          padding: '1.75rem',
          borderRadius: '16px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 8px 30px rgba(15,23,42,0.06)',
          animation: 'fadeSlideIn 0.25s ease-out',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0F172A' }}>Detalles de Solicitud</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.5rem' }}>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#0F172A' }}>{promedioEncuesta.toFixed(1)}</div>
                <div>
                  <div style={{ display: 'flex', gap: '2px' }}>{renderEstrellas(Math.round(promedioEncuesta), 14)}</div>
                  <div style={{ fontSize: '0.74rem', color: '#64748B', fontWeight: 500, marginTop: '2px' }}>Promedio de {encuestas.length} encuestas</div>
                </div>
              </div>
            </div>
            <button
              onClick={() => setSolicitudSeleccionada(null)}
              style={{
                background: '#F1F5F9',
                border: 'none',
  color: '#E11D48',
                padding: '0.4rem 0.9rem',
                borderRadius: '8px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.8rem',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#E2E8F0'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#F1F5F9'}
            >
              <X size={14} />
              Cerrar Vista
            </button>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', borderBottom: '1px solid #E2E8F0', paddingBottom: '1.25rem', flexWrap: 'wrap' }}>
            <button onClick={() => setModalSolicitudCompleta(true)} style={{ padding: '0.5rem 1.2rem', background: '#1E3A8A', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem', boxShadow: '0 2px 8px rgba(30,58,138,0.15)', display: 'flex', alignItems: 'center', gap: '0.4rem', transition: 'all 0.15s ease' }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#0F172A'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#1E3A8A'}>
              <FileText size={16} />
              Ver Solicitud Completa
            </button>
            <button onClick={() => setModalEncuestasDetallado(true)} style={{ padding: '0.5rem 1.2rem', background: '#F1F5F9', color: '#0F172A', border: '1px solid #E2E8F0', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem', transition: 'all 0.15s ease' }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#E2E8F0'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#F1F5F9'}>
              <BarChart3 size={16} />
              Ver Encuestas
            </button>
          </div>

          {userRol === 'ADMIN' && (
            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <span style={{ fontSize: '0.85rem', color: '#64748B', fontWeight: 500 }}>
                    Estado actual:
                  </span>
                  <span style={{
                    padding: '0.25rem 0.85rem',
                    borderRadius: '9999px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    background: getStatusCfg(solicitudActualObj?.estado ?? '').bg,
                    color: getStatusCfg(solicitudActualObj?.estado ?? '').color,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.3rem',
                  }}>
                    {getStatusCfg(solicitudActualObj?.estado ?? '').icon}
                    {solicitudActualObj?.estado}
                  </span>
                </div>
                {solicitudActualObj?.estado === 'Pendiente' && (
                  <div style={{ display: 'flex', gap: '0.6rem' }}>
                    <button onClick={() => setModalAprobarAbierto(true)} style={{ padding: '0.5rem 1.1rem', background: '#16A34A', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', transition: 'all 0.15s ease' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#15803D'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#16A34A'}>
                      <CheckCircle size={15} />
                      Aprobar
                    </button>
                    <button onClick={() => setModalRechazarAbierto(true)} style={{ padding: '0.5rem 1.1rem', background: '#DC2626', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem', transition: 'all 0.15s ease' }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#B91C1C'}
                      onMouseLeave={(e) => e.currentTarget.style.background = '#DC2626'}>
                      <XCircle size={15} />
                      Rechazar
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0F172A', marginBottom: '0.85rem', borderBottom: '1.5px solid #F1F5F9', paddingBottom: '0.5rem' }}>Materiales Solicitados</h3>
              {cargandoMateriales ? (
                <div style={{ color: '#64748B', fontSize: '0.85rem' }}>Cargando materiales...</div>
              ) : materiales.length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  {materiales.map(m => (
                    <li key={m.id} style={{ fontSize: '0.85rem', color: '#0F172A', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <CheckCircle size={14} color="#2563EB" style={{ flexShrink: 0 }} />
                      <span>{m.tipoMaterial} {m.descripcionOtro && `(${m.descripcionOtro})`}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <div style={{ color: '#64748B', fontSize: '0.85rem' }}>No hay materiales especificados.</div>
              )}
            </div>

            <div>
              <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: '#0F172A', marginBottom: '0.85rem', borderBottom: '1.5px solid #F1F5F9', paddingBottom: '0.5rem' }}>Vista de Administrador</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                <div>
                  <strong style={{ color: '#0F172A' }}>Descripcion:</strong>
                  <p style={{ margin: '4px 0 0', color: '#64748B', lineHeight: 1.4 }}>{solicitudActualObj?.descripcion || "Sin descripcion"}</p>
                </div>
                <div>
                  <strong style={{ color: '#0F172A' }}>Objetivo de Cobertura:</strong>
                  <p style={{ margin: '4px 0 0', color: '#64748B', lineHeight: 1.4 }}>{solicitudActualObj?.objetivoCobertura || "Sin objetivo especificado"}</p>
                </div>
                <div>
                  <strong style={{ color: '#0F172A' }}>Lugar Especifico:</strong>
                  <p style={{ margin: '4px 0 0', color: '#64748B' }}>{solicitudActualObj?.lugarEspecifico || "No especificado"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== TABLE ===== */}
      {filtradas.length > 0 && (
        <div style={{ background: '#FFFFFF', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(15,23,42,0.04), 0 1px 2px rgba(15,23,42,0.02)', border: '1px solid #E2E8F0' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Folio</th>
                  <th style={thStyle}>Evento</th>
                  <th style={thStyle}>Institucion</th>
                  <th style={thStyle}>Plantel</th>
                  <th style={thStyle}>Fecha</th>
                  <th style={thStyle}>Estado</th>
                  <th style={thStyle}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtradas.map((s) => {
                  const isCancelada = s.estado === 'Cancelada'
                  return (
                    <tr
                      key={s.id}
                      style={{
                        background: '#FFFFFF',
                        borderBottom: '1px solid #F1F5F9',
                        transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
                        opacity: isCancelada ? 0.55 : 1,
                        transform: 'translateX(0)',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#FAFBFC'; e.currentTarget.style.transform = 'translateX(3px)'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.transform = 'translateX(0)'; }}
                    >
                      <td style={tdStyle}>
                        {isCancelada
                          ? <span style={{ textDecoration: 'line-through', color: '#64748B', fontWeight: 500 }}>{s.folio}</span>
                          : <span style={{ fontWeight: 600, color: '#0F172A' }}>{s.folio}</span>
                        }
                      </td>
                      <td style={tdStyle}>
                        <button
                          onClick={() => setSolicitudSeleccionada(s.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: isCancelada ? '#64748B' : '#1E3A8A',
                            fontWeight: 600,
                            cursor: 'pointer',
                            padding: 0,
                            fontSize: '0.85rem',
                            textAlign: 'left',
                            textDecoration: isCancelada ? 'line-through' : 'none',
                            transition: 'color 0.15s ease',
                          }}
                          onMouseEnter={(e) => { if (!isCancelada) e.currentTarget.style.color = '#2563EB' }}
                          onMouseLeave={(e) => { if (!isCancelada) e.currentTarget.style.color = '#1E3A8A' }}
                        >
                          {s.nombreEvento}
                        </button>
                      </td>
                      <td style={tdStyle}>{s.institucion?.nombre || "Externa"}</td>
                      <td style={tdStyle}>{s.plantel?.nombre || (s.lugarEspecifico === "Lugar Externo" ? "Lugar Externo" : "No asignado")}</td>
                      <td style={{ ...tdStyle, fontWeight: 500, color: '#64748B' }}>{formatearFecha(s.fechaEvento)}</td>
                      <td style={tdStyle}>
                        <span style={{
                          padding: '0.2rem 0.75rem',
                          borderRadius: '9999px',
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          background: getStatusCfg(s.estado).bg,
                          color: getStatusCfg(s.estado).color,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                        }}>
                          {getStatusCfg(s.estado).icon}
                          {s.estado}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        {!isCancelada && (
                          <button
                            onClick={() => { setIdSolicitudACancelar(s.id); setModalCancelacionAbierto(true); }}
                            style={{
                              background: 'none',
                              color: '#DC2626',
                              border: '1px solid rgba(220,38,38,0.25)',
                              borderRadius: '6px',
                              padding: '0.3rem 0.75rem',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#DC2626'; e.currentTarget.style.color = '#FFFFFF' }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#DC2626' }}
                          >
                            Cancelar
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== MODALS ===== */}

      {/* CANCEL MODAL */}
      {modalCancelacionAbierto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(6px)' }}>
          <div style={{ background: '#FFFFFF', padding: '2rem', borderRadius: '16px', maxWidth: '420px', width: '90%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              <AlertTriangle size={22} color="#DC2626" />
              <h3 style={{ margin: 0, color: '#DC2626', fontSize: '1.15rem', fontWeight: 700 }}>Confirmar Cancelacion</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#0F172A', lineHeight: '1.5', margin: '0 0 1.25rem', fontWeight: 500 }}>
              Recuerde que las cancelaciones deben realizarse con un minimo de 48 horas de anticipacion al evento. Desea continuar de todos modos?
            </p>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#0F172A', marginBottom: '0.4rem' }}>Motivo de la cancelacion (Opcional)</label>
            <textarea
              value={motivoCancelacion}
              onChange={(e) => setMotivoCancelacion(e.target.value)}
              placeholder="Escriba la razon de la cancelacion aqui..."
              rows={3}
              style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.82rem', marginBottom: '1.25rem', fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box', outline: 'none' }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#1E3A8A'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#E2E8F0'}
            />
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => { setModalCancelacionAbierto(false); setIdSolicitudACancelar(null); setMotivoCancelacion(''); }} style={{ flex: 1, padding: '0.6rem', background: '#F1F5F9', color: '#0F172A', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem', transition: 'all 0.15s ease' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#E2E8F0'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#F1F5F9'}
              >Atras</button>
              <button onClick={confirmarCancelacion} style={{ flex: 1, padding: '0.6rem', background: '#DC2626', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', transition: 'all 0.15s ease' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#B91C1C'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#DC2626'}
              >
                <XCircle size={16} />
                Si, cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SURVEY DETAIL MODAL */}
      {modalEncuestasDetallado && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, backdropFilter: 'blur(6px)' }}>
          <div style={{ background: '#FFFFFF', padding: '2rem', borderRadius: '16px', maxWidth: '580px', width: '90%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <ClipboardList size={22} color="#1E3A8A" />
                <h3 style={{ margin: 0, color: '#0F172A', fontWeight: 700, fontSize: '1.1rem' }}>Historial Detallado de Encuestas</h3>
              </div>
              <button onClick={() => setModalEncuestasDetallado(false)} style={{ background: '#F1F5F9', border: 'none', padding: '0.4rem 0.85rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <X size={14} />
                Cerrar
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {encuestas.map(e => (
                <div key={e.id} style={{ padding: '1rem 1.25rem', background: '#F8FAFC', borderRadius: '10px', borderLeft: '4px solid #1E3A8A' }}>
                  <div style={{ marginBottom: '0.4rem' }}>{renderEstrellas(e.satisfaccionGral, 14)}</div>
                  <p style={{ margin: '0 0 0.4rem', fontSize: '0.85rem', color: '#0F172A', lineHeight: '1.4', fontWeight: 500 }}>{e.comentarios || "Sin comentarios adicionales."}</p>
                  <span style={{ fontSize: '0.72rem', color: '#64748B', fontWeight: 500 }}>Respondido el: {formatearFecha(e.fechaRespuesta)}</span>
                </div>
              ))}
              {encuestas.length === 0 && (
                <div style={{ textAlign: 'center', color: '#64748B', fontSize: '0.85rem', fontWeight: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '1rem' }}>
                  <Info size={16} color="#64748B" />
                  Aun no se han recibido evaluaciones para este evento.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* APPROVE MODAL */}
      {modalAprobarAbierto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(6px)' }}>
          <div style={{ background: '#FFFFFF', padding: '2rem', borderRadius: '16px', maxWidth: '420px', width: '90%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              <CheckCircle size={22} color="#16A34A" />
              <h3 style={{ margin: 0, color: '#16A34A', fontSize: '1.15rem', fontWeight: 700 }}>Confirmar Aprobacion</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#0F172A', lineHeight: '1.5', margin: '0 0 1.25rem', fontWeight: 500 }}>
              Desea aprobar esta solicitud?
            </p>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => setModalAprobarAbierto(false)} style={{ flex: 1, padding: '0.6rem', background: '#F1F5F9', color: '#0F172A', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem', transition: 'all 0.15s ease' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#E2E8F0'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#F1F5F9'}
              >Cancelar</button>
              <button onClick={confirmarAprobacion} style={{ flex: 1, padding: '0.6rem', background: '#16A34A', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', transition: 'all 0.15s ease' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#15803D'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#16A34A'}
              >
                <CheckCircle size={16} />
                Si, aprobar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REJECT MODAL */}
      {modalRechazarAbierto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, backdropFilter: 'blur(6px)' }}>
          <div style={{ background: '#FFFFFF', padding: '2rem', borderRadius: '16px', maxWidth: '420px', width: '90%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
              <XCircle size={22} color="#DC2626" />
              <h3 style={{ margin: 0, color: '#DC2626', fontSize: '1.15rem', fontWeight: 700 }}>Confirmar Rechazo</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#0F172A', lineHeight: '1.5', margin: '0 0 1rem', fontWeight: 500 }}>
              Esta seguro de rechazar esta solicitud? Proporcione el motivo del rechazo.
            </p>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#0F172A', marginBottom: '0.4rem' }}>Motivo del rechazo *</label>
            <textarea
              value={motivoRechazo}
              onChange={(e) => setMotivoRechazo(e.target.value)}
              placeholder="Escriba el motivo del rechazo..."
              rows={3}
              style={{ width: '100%', padding: '0.65rem', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '0.82rem', marginBottom: '1.25rem', fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box', outline: 'none' }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#1E3A8A'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#E2E8F0'}
            />
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button onClick={() => { setModalRechazarAbierto(false); setMotivoRechazo(''); }} style={{ flex: 1, padding: '0.6rem', background: '#F1F5F9', color: '#0F172A', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem', transition: 'all 0.15s ease' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#E2E8F0'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#F1F5F9'}
              >Atras</button>
              <button
                onClick={confirmarRechazo}
                disabled={!motivoRechazo.trim()}
                style={{
                  flex: 1,
                  padding: '0.6rem',
                  background: motivoRechazo.trim() ? '#DC2626' : '#94A3B8',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 600,
                  cursor: motivoRechazo.trim() ? 'pointer' : 'not-allowed',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.35rem',
                  transition: 'all 0.15s ease',
                }}
              >
                <XCircle size={16} />
                Si, rechazar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFLICT MODAL */}
      {modalConflictoHorario && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2500, backdropFilter: 'blur(6px)' }}>
          <div style={{ background: '#FFFFFF', padding: '2rem', borderRadius: '16px', maxWidth: '480px', width: '90%', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.75rem' }}>
              <AlertTriangle size={22} color="#D97706" />
              <h3 style={{ margin: 0, color: '#D97706', fontSize: '1.15rem', fontWeight: 700 }}>Conflicto de Horario Detectado</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: '#0F172A', lineHeight: '1.5', margin: '0 0 1.25rem', fontWeight: 500 }}>
              Se detectaron eventos aprobados en el mismo horario y plantel.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.25rem' }}>
              {conflictos.map((c) => (
                <div key={c.id} style={{ padding: '0.65rem 1rem', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', borderLeft: '4px solid #D97706' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0F172A' }}>{c.nombreEvento}</div>
                  <div style={{ fontSize: '0.78rem', color: '#64748B', marginTop: '0.2rem', fontWeight: 500 }}>
                    {c.horaInicio} — {c.horaFin}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                onClick={() => { setModalConflictoHorario(false); setConflictos([]); }}
                style={{ flex: 1, padding: '0.6rem', background: '#F1F5F9', color: '#0F172A', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem', transition: 'all 0.15s ease' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#E2E8F0'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#F1F5F9'}
              >
                Cancelar
              </button>
              <button
                onClick={confirmarAprobacionForzada}
                style={{ flex: 1, padding: '0.6rem', background: '#D97706', color: '#FFFFFF', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', transition: 'all 0.15s ease' }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#B45309'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#D97706'}
              >
                <AlertTriangle size={16} />
                Aprobar de todas formas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && (
        <div style={{
          position: 'fixed',
          bottom: '1.5rem',
          right: '1.5rem',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'stretch',
          background: '#0F172A',
          borderRadius: '12px',
          boxShadow: '0 12px 32px -4px rgba(15,23,42,0.2), 0 4px 12px rgba(0,0,0,0.08)',
          maxWidth: '400px',
          animation: 'slideInRight 0.35s ease-out',
          overflow: 'hidden',
        }}>
          <div style={{
            width: '4px',
            flexShrink: 0,
            background: toast.tipo === 'success' ? '#22C55E' : '#EF4444',
          }} />
          <div style={{
            padding: '0.85rem 1.15rem',
            color: '#FFFFFF',
            fontWeight: 600,
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            lineHeight: 1.4,
          }}>
            {toast.tipo === 'success' ? <CheckCircle size={18} color="#22C55E" /> : <XCircle size={18} color="#EF4444" />}
            {toast.mensaje}
          </div>
        </div>
      )}

      <SolicitudCompletaModal
        open={modalSolicitudCompleta}
        onClose={() => {
          setModalSolicitudCompleta(false)
          if (solicitudIdFromRoute) {
            navigate('/dashboard', { replace: true })
          }
        }}
        solicitud={solicitudActualObj ?? null}
        materiales={materiales}
        userRol={userRol}
      />

    </div>
  )
}

const thStyle: React.CSSProperties = {
  padding: '0.75rem 1.25rem',
  textAlign: 'left',
  whiteSpace: 'nowrap',
  fontWeight: 700,
  fontSize: '0.65rem',
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#FFFFFF',
  background: '#E11D48',
  borderBottom: '2px solid #E2E8F0',
}

const tdStyle: React.CSSProperties = {
  padding: '0.75rem 1.25rem',
  whiteSpace: 'nowrap',
  borderBottom: '1px solid #F1F5F9',
  fontSize: '0.85rem',
}
