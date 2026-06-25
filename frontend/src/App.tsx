import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import axios from 'axios'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import NuevaSolicitud from './pages/NuevaSolicitud'
import Evaluar from './pages/Evaluar'
import EstadisticasView from './pages/EstadisticasView'
import CalendarioView from './pages/CalendarioView'

type Vista = 'dashboard' | 'nueva' | 'estadisticas' | 'calendario'

const COLORS = {
  primary: '#1e3a8a',
  secondary: '#dc2626',
  background: '#f8fafc',
  surface: '#ffffff',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  white: '#ffffff'
}

const linkStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: COLORS.white,
  fontSize: '0.95rem',
  fontWeight: 600,
  cursor: 'pointer',
  padding: '0.5rem 1rem',
  borderRadius: 6,
}

const linkActivo: React.CSSProperties = {
  ...linkStyle,
  backgroundColor: 'rgba(255,255,255,0.2)',
}

function AppContent() {
  const [usuario, setUsuario] = useState<{ id: number; correo: string; rol: string; token: string } | null>(null)
  const [vistaActual, setVistaActual] = useState<Vista>('dashboard')
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
        style={{
          background: COLORS.primary,
          padding: '0.75rem 2rem',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
      >
        <span
          style={{ color: COLORS.white, fontWeight: 800, fontSize: '1.2rem', marginRight: 'auto', letterSpacing: '-0.025em', cursor: 'pointer' }}
          onClick={() => { setVistaActual('dashboard'); navigate('/dashboard'); }}
        >
          TigreTrack — {usuario.rol === 'ADMIN' ? 'Admin' : 'Usuario'}
        </span>
        <button
          style={vistaActual === 'nueva' ? linkActivo : linkStyle}
          onClick={() => { setVistaActual('nueva'); navigate('/nueva'); }}
        >
          Nueva Solicitud
        </button>
        <button
          style={vistaActual === 'estadisticas' ? linkActivo : linkStyle}
          onClick={() => { setVistaActual('estadisticas'); navigate('/estadisticas'); }}
        >
          Ver Estadísticas
        </button>
        <button
          style={vistaActual === 'calendario' ? linkActivo : linkStyle}
          onClick={() => { setVistaActual('calendario'); navigate('/calendario'); }}
        >
          Calendario
        </button>
        <button
          style={linkStyle}
          onClick={handleLogout}
        >
          Salir
        </button>
      </nav>

      <main style={{ padding: '2rem' }}>
        {vistaActual === 'dashboard' && <Dashboard userRol={usuario.rol} />}
        {vistaActual === 'nueva' && <NuevaSolicitud />}
        {vistaActual === 'estadisticas' && <EstadisticasView />}
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
