import { useState } from 'react'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import NuevaSolicitud from './pages/NuevaSolicitud'

type Vista = 'dashboard' | 'nueva'

const linkStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#fff',
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

function App() {
  const [usuario, setUsuario] = useState<{ id: number; correo: string; rol: string } | null>(null)
  const [vistaActual, setVistaActual] = useState<Vista>('dashboard')

  if (!usuario) {
    return <Login onLogin={setUsuario} />
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif' }}>
      <nav
        style={{
          background: '#1e3a5f',
          padding: '0.75rem 2rem',
          display: 'flex',
          gap: '1rem',
          alignItems: 'center',
        }}
      >
        <span style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem', marginRight: 'auto' }}>
          Eventos UMAD / IMM — {usuario.rol === 'ADMIN' ? 'Admin' : 'Usuario'}
        </span>
        {usuario.rol === 'ADMIN' && (
          <button
            style={vistaActual === 'dashboard' ? linkActivo : linkStyle}
            onClick={() => setVistaActual('dashboard')}
          >
            Ver Dashboard
          </button>
        )}
        <button
          style={vistaActual === 'nueva' ? linkActivo : linkStyle}
          onClick={() => setVistaActual('nueva')}
        >
          Nueva Solicitud
        </button>
        <button
          style={linkStyle}
          onClick={() => setUsuario(null)}
        >
          Salir
        </button>
      </nav>

      <main>
        {vistaActual === 'dashboard' && usuario.rol === 'ADMIN' && <Dashboard />}
        {vistaActual === 'nueva' && <NuevaSolicitud />}
      </main>
    </div>
  )
}

export default App
