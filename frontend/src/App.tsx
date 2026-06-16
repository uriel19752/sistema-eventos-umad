import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import NuevaSolicitud from './pages/NuevaSolicitud'
import Evaluar from './pages/Evaluar'

type Vista = 'dashboard' | 'nueva'

const COLORS = {
  primary: '#1e3a8a', // Azul Marino Institucional
  secondary: '#dc2626', // Rojo Tigre
  background: '#f8fafc', // Blanco/Gris Muy Claro
  surface: '#ffffff', // Blanco puro para tarjetas
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
  const [usuario, setUsuario] = useState<{ id: number; correo: string; rol: string } | null>(null)
  const [vistaActual, setVistaActual] = useState<Vista>('dashboard')
  const navigate = useNavigate()

  if (!usuario) {
    return <Login onLogin={(user) => { setUsuario(user); navigate('/dashboard'); }} />
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
        <span style={{ color: COLORS.white, fontWeight: 800, fontSize: '1.2rem', marginRight: 'auto', letterSpacing: '-0.025em' }}>
          TigreTrack — {usuario.rol === 'ADMIN' ? 'Admin' : 'Usuario'}
        </span>
        {usuario.rol === 'ADMIN' && (
          <button
            style={vistaActual === 'dashboard' ? linkActivo : linkStyle}
            onClick={() => { setVistaActual('dashboard'); navigate('/dashboard'); }}
          >
            Ver Dashboard
          </button>
        )}
        <button
          style={vistaActual === 'nueva' ? linkActivo : linkStyle}
          onClick={() => { setVistaActual('nueva'); navigate('/nueva'); }}
        >
          Nueva Solicitud
        </button>
        <button
          style={linkStyle}
          onClick={() => { setUsuario(null); navigate('/login'); }}
        >
          Salir
        </button>
      </nav>

      <main style={{ padding: '2rem' }}>
        {vistaActual === 'dashboard' && usuario.rol === 'ADMIN' && <Dashboard />}
        {vistaActual === 'nueva' && <NuevaSolicitud />}
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
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
