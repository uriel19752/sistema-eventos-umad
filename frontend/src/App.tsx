import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import axios from 'axios'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import NuevaSolicitud from './pages/NuevaSolicitud'
import Evaluar from './pages/Evaluar'
import CancelarSolicitudView from './pages/CancelarSolicitudView'
import EstadisticasView from './pages/EstadisticasView'
import CalendarioView from './pages/CalendarioView'
import LogoTigreTrack from './assets/logos/LogoTigreTrack'
import { COLORS } from './theme/colors'
import NotificationBell from './components/NotificationBell'
import ErrorBoundary from './components/ErrorBoundary'

type Vista = 'dashboard' | 'nueva' | 'estadisticas' | 'calendario'

function AppContent() {
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

  function handleLogin(user: { id: number; correo: string; rol: string; token: string }) {
    setUsuario(user)
    navigate('/dashboard')
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
        {vistaActual === 'dashboard' && <Dashboard userRol={usuario.rol} onCambioInstitucion={setInstitucionActual} />}
        {vistaActual === 'nueva' && <NuevaSolicitud />}
        {vistaActual === 'estadisticas' && <ErrorBoundary><EstadisticasView onCambioInstitucion={setInstitucionActual} /></ErrorBoundary>}
        {vistaActual === 'calendario' && <CalendarioView userRol={usuario.rol} />}
      </main>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/evaluar/:id" element={<Evaluar />} />
        <Route path="/solicitudes/cancelar" element={<CancelarSolicitudView />} />
        <Route path="/solicitudes/detalle" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<AppContent />} />
        <Route path="/dashboard" element={<AppContent />} />
        <Route path="/nueva" element={<AppContent />} />
        <Route path="/estadisticas" element={<AppContent />} />
        <Route path="/calendario" element={<AppContent />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
