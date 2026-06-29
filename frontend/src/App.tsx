import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import axios from 'axios'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import NuevaSolicitud from './pages/NuevaSolicitud'
import Evaluar from './pages/Evaluar'
import EstadisticasView from './pages/EstadisticasView'
import CalendarioView from './pages/CalendarioView'
import LogoTigreTrack from './assets/logos/LogoTigreTrack'
import { COLORS } from './theme/colors'

type Vista = 'dashboard' | 'nueva' | 'estadisticas' | 'calendario'

const linkStyle: React.CSSProperties = {
  background: 'none',
  border: '1px solid rgba(255,255,255,0.4)',
  color: COLORS.white,
  fontSize: '0.95rem',
  fontWeight: 600,
  cursor: 'pointer',
  padding: '0.5rem 1.2rem',
  borderRadius: 6,
  transition: 'all 0.2s ease-in-out',
}

const linkActivo: React.CSSProperties = {
  ...linkStyle,
  backgroundColor: COLORS.secondary,
  border: '1px solid transparent',
  fontWeight: 'bold',
}

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

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', backgroundColor: COLORS.background, minHeight: '100vh' }}>
      <nav
        aria-label="Navegación principal"
        style={{
          background: COLORS.primary,
          padding: '0.75rem 2rem',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
      >
        <div
          role="button"
          tabIndex={0}
          aria-label="Ir al inicio"
          style={{ marginRight: 'auto', cursor: 'pointer' }}
          onClick={() => { setVistaActual('dashboard'); navigate('/dashboard'); }}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setVistaActual('dashboard'); navigate('/dashboard'); } }}
        >
          <LogoTigreTrack institucion={institucionActual} height={34} />
        </div>
        <button
          aria-label="Nueva solicitud"
          aria-current={vistaActual === 'nueva' ? 'page' : undefined}
          style={vistaActual === 'nueva' ? linkActivo : linkStyle}
          onClick={() => { setVistaActual('nueva'); navigate('/nueva'); }}
        >
          Nueva Solicitud
        </button>
        <button
          aria-label="Ver estadísticas"
          aria-current={vistaActual === 'estadisticas' ? 'page' : undefined}
          style={vistaActual === 'estadisticas' ? linkActivo : linkStyle}
          onClick={() => { setVistaActual('estadisticas'); navigate('/estadisticas'); }}
        >
          Ver Estadísticas
        </button>
        <button
          aria-label="Calendario"
          aria-current={vistaActual === 'calendario' ? 'page' : undefined}
          style={vistaActual === 'calendario' ? linkActivo : linkStyle}
          onClick={() => { setVistaActual('calendario'); navigate('/calendario'); }}
        >
          Calendario
        </button>
        <button
          aria-label="Cerrar sesión"
          style={linkStyle}
          onClick={handleLogout}
        >
          Salir
        </button>
      </nav>

      <main style={{ padding: '2rem' }}>
        {vistaActual === 'dashboard' && <Dashboard userRol={usuario.rol} onCambioInstitucion={setInstitucionActual} />}
        {vistaActual === 'nueva' && <NuevaSolicitud />}
        {vistaActual === 'estadisticas' && <EstadisticasView onCambioInstitucion={setInstitucionActual} />}
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
