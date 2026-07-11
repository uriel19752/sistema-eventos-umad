import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import NuevaSolicitud from './pages/NuevaSolicitud'
import Evaluar from './pages/Evaluar'
import CancelarSolicitudView from './pages/CancelarSolicitudView'
import EstadisticasView from './pages/EstadisticasView'
import CalendarioView from './pages/CalendarioView'
import Proveedores from './pages/Proveedores'
import LogoTigreTrack from './assets/logos/LogoTigreTrack'
import { COLORS } from './theme/colors'
import NotificationBell from './components/NotificationBell'
import ErrorBoundary from './components/ErrorBoundary'

type Vista = 'dashboard' | 'nueva' | 'estadisticas' | 'calendario' | 'proveedores'

function AppContent() {
  const { id } = useParams<{ id?: string }>()
  const [usuario, setUsuario] = useState<{ id: number; correo: string; rol: string; token: string } | null>(null)
  const [vistaActual, setVistaActual] = useState<Vista>('dashboard')
  const [institucionActual, setInstitucionActual] = useState<'umad' | 'prepa' | 'imm' | 'sistema'>('sistema')
  const navigate = useNavigate()

  useEffect(() => {
    if (usuario) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${usuario.token}`
    }
  }, [usuario])

  function handleLogout() {
    delete axios.defaults.headers.common['Authorization']
    setUsuario(null)
    navigate('/login')
  }

  function getRedirectUrl(): string | null {
    const queryParams = new URLSearchParams(window.location.search)
    let targetUrl = queryParams.get('redirect')
    if (targetUrl && targetUrl.includes('?')) {
      const fullSearch = window.location.search
      const match = fullSearch.match(/[?&]redirect=(.+)$/)
      if (match) {
        targetUrl = decodeURIComponent(match[1])
      }
    }
    return targetUrl
  }

  function handleLogin(user: { id: number; correo: string; rol: string; token: string }) {
    setUsuario(user)
    const redirectTo = getRedirectUrl()
    if (redirectTo) {
      navigate(redirectTo, { replace: true })
    } else if (id) {
      return
    } else {
      const searchParams = new URLSearchParams(window.location.search)
      const solicitudId = searchParams.get('solicitudId')
      if (solicitudId) {
        navigate(`/dashboard/solicitud/${solicitudId}`, { replace: true })
      } else {
        navigate('/dashboard')
      }
    }
  }

  if (!usuario) {
    return <Login onLogin={handleLogin} />
  }

  const rutas = [
    { key: 'nueva' as Vista, label: 'Nueva Solicitud', path: '/nueva' },
    { key: 'estadisticas' as Vista, label: 'Estadísticas', path: '/estadisticas' },
    { key: 'calendario' as Vista, label: 'Calendario', path: '/calendario' },
  ]

  const estiloBtnActivo: React.CSSProperties = {
    background: '#E11D48', color: '#FFFFFF', fontWeight: 600,
    border: 'none', padding: '0.5rem 1rem', borderRadius: '8px',
    cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'Inter, sans-serif',
    boxShadow: '0 4px 14px rgba(225,29,72,0.3)',
    transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
  }

  const estiloBtnInactivo: React.CSSProperties = {
    background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.85)',
    fontWeight: 500, border: '1px solid rgba(255,255,255,0.1)',
    padding: '0.5rem 1rem', borderRadius: '8px',
    cursor: 'pointer', fontSize: '0.875rem', fontFamily: 'Inter, sans-serif',
    transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
  }

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif', backgroundColor: COLORS.background, minHeight: '100vh' }}>
      <nav
        aria-label="Navegación principal"
        style={{
          position: 'sticky', top: 0, zIndex: 50,
          height: '64px',
          background: 'linear-gradient(135deg, #1E3A8A 0%, #162d6e 100%)',
          display: 'flex',
          gap: '0.4rem',
          alignItems: 'center',
          padding: '0 2rem',
          boxShadow: '0 2px 16px rgba(15,23,42,0.15)',
        }}
      >
        {/* Bloque interactivo — Logo + T badge */}
        <div
          role="button"
          tabIndex={0}
          aria-label="Ir al inicio"
          style={{ marginRight: 'auto', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.7rem' }}
          onClick={() => { setVistaActual('dashboard'); navigate('/dashboard'); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setVistaActual('dashboard'); navigate('/dashboard'); } }}
        >
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'linear-gradient(135deg, #E11D48, #BE123C)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(225,29,72,0.3)',
          }}>
            <span style={{ color: 'white', fontSize: '0.9rem', fontWeight: 900, fontFamily: 'Inter, sans-serif' }}>T</span>
          </div>
          <LogoTigreTrack institucion={institucionActual} height={28} />
        </div>

        <div style={{ width: '1px', height: '22px', background: 'rgba(255,255,255,0.15)' }} />

        {/* Botones de navegación mapeados */}
        {rutas.map((ruta) => {
          const activo = vistaActual === ruta.key
          return (
            <button
              key={ruta.key}
              aria-label={ruta.label}
              aria-current={activo ? 'page' : undefined}
              style={activo ? estiloBtnActivo : estiloBtnInactivo}
              onClick={() => { setVistaActual(ruta.key); navigate(ruta.path); }}
              onMouseEnter={(e) => {
                if (!activo) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.14)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
                }
              }}
              onMouseLeave={(e) => {
                if (!activo) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
                }
              }}
            >
              {ruta.label}
            </button>
          )
        })}

        {usuario.rol === 'ADMIN' && (
          <button
            aria-label="Proveedores"
            aria-current={vistaActual === 'proveedores' ? 'page' : undefined}
            style={vistaActual === 'proveedores' ? estiloBtnActivo : estiloBtnInactivo}
            onClick={() => { setVistaActual('proveedores'); navigate('/proveedores'); }}
            onMouseEnter={(e) => {
              if (vistaActual !== 'proveedores') {
                e.currentTarget.style.background = 'rgba(255,255,255,0.14)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
              }
            }}
            onMouseLeave={(e) => {
              if (vistaActual !== 'proveedores') {
                e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
              }
            }}
          >
            Proveedores
          </button>
        )}

        <div style={{ flex: 1 }} />

        <NotificationBell />
        
        {/* Salir */}
        <button
          aria-label="Cerrar sesión"
          style={{
            background: 'transparent', color: 'white',
            border: '1px solid rgba(255,255,255,0.2)',
            padding: '0.5rem 1rem', borderRadius: '8px',
            cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500,
            fontFamily: 'Inter, sans-serif',
            transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'
            e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
            e.currentTarget.style.background = 'transparent'
          }}
          onClick={handleLogout}
        >
          Salir
        </button>
      </nav>

      <main style={{ padding: '1.75rem 2rem', minHeight: 'calc(100vh - 64px)' }}>
        {vistaActual === 'dashboard' && <Dashboard userRol={usuario.rol} onCambioInstitucion={setInstitucionActual} solicitudIdFromRoute={id ? Number(id) : undefined} />}
        {vistaActual === 'nueva' && <NuevaSolicitud />}
        {vistaActual === 'estadisticas' && <ErrorBoundary><EstadisticasView onCambioInstitucion={setInstitucionActual} /></ErrorBoundary>}
        {vistaActual === 'calendario' && <CalendarioView userRol={usuario.rol} />}
        {vistaActual === 'proveedores' && <Proveedores />}
      </main>
    </div>
  )
}

/**
 * Componente de redirección para enlaces profundos (deep links) desde correos.
 *
 * Flujo de parsing:
 * 1. Los correos de notificación (aprobación, cancelación) incluyen enlaces del
 *    tipo `https://app/solicitudes/detalle?id=42`.
 * 2. Este componente se monta en `/solicitudes/detalle` y extrae el query param
 *    `id` mediante `URLSearchParams`.
 * 3. Si el parámetro existe, redirige a `/dashboard/solicitud/{id}` que, a su vez,
 *    renderiza `AppContent` con el hook `useParams` capturando `:id`.
 * 4. Si no existe `id`, redirige al dashboard base.
 *
 * El componente retorna `null` (no renderiza nada visible) porque su único
 * propósito es la navegación programática con `{ replace: true }`, que evita
 * que la URL de redirección quede en el historial del navegador.
 */
function DetalleRedirect() {
  const navigate = useNavigate()
  useEffect(() => {
    const search = window.location.search
    const params = new URLSearchParams(search)
    const id = params.get('id')
    if (id) {
      navigate(`/dashboard/solicitud/${id}`, { replace: true })
    } else {
      navigate('/dashboard', { replace: true })
    }
  }, [navigate])
  return null
}

/**
 * Componente raíz de la aplicación — arquitectura SPA con enrutamiento del lado
 * del cliente (React Router v6).
 *
 * Propósito global:
 *   Define el árbol de rutas de la SPA, actuando como la red de distribución
 *   declarativa del frontend. Cada ruta mapea una URL a un componente página.
 *
 * Estructura de rutas:
 *
 *   **Rutas públicas** (sin autenticación):
 *   - `/evaluar/:id`          → Formulario público de encuesta de satisfacción
 *                               (asistentes externos al evento).
 *   - `/solicitudes/cancelar` → Vista pública para cancelar solicitudes desde
 *                               el enlace del correo de confirmación.
 *   - `/solicitudes/detalle`  → Redirección temporal (deep link) que parsea
 *                               `?id=` y redirige a `/dashboard/solicitud/:id`.
 *
 *   **Rutas protegidas** (envuelven `AppContent`, que a su vez verifica que
 *   `usuario` no sea `null` antes de renderizar el Dashboard):
 *   - `/login`                 → Pantalla de inicio de sesión.
 *   - `/dashboard/solicitud/:id` → Dashboard con el modal de detalle auto-abierto
 *                                 para la solicitud indicada en la URL.
 *   - `/dashboard`             → Dashboard principal con tabla de solicitudes.
 *   - `/nueva`                 → Formulario de nueva solicitud de cobertura.
 *   - `/estadisticas`          → Panel de estadísticas y gráficas.
 *   - `/calendario`            → Vista del calendario institucional.
 *   - `/proveedores`           → CRUD de proveedores (solo ADMIN).
 *   - `/`                      → Redirección predeterminada a `/dashboard`.
 *
 * @returns Árbol de rutas renderizado por `BrowserRouter`.
 */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/evaluar/:id" element={<Evaluar />} />
        <Route path="/solicitudes/cancelar" element={<CancelarSolicitudView />} />
        <Route path="/solicitudes/detalle" element={<DetalleRedirect />} />
        <Route path="/login" element={<AppContent />} />
        <Route path="/dashboard/solicitud/:id" element={<AppContent />} />
        <Route path="/dashboard" element={<AppContent />} />
        <Route path="/nueva" element={<AppContent />} />
        <Route path="/estadisticas" element={<AppContent />} />
        <Route path="/calendario" element={<AppContent />} />
        <Route path="/proveedores" element={<AppContent />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
