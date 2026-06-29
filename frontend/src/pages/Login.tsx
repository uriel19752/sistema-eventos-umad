import { useState } from 'react'
import axios from 'axios'

interface Props {
  onLogin: (usuario: { id: number; correo: string; rol: string; token: string }) => void
}
import { COLORS } from '../theme/colors'

export default function Login({ onLogin }: Props) {
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await axios.post('/api/auth/login', { correo, password })
      onLogin(res.data)
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error ?? 'Error de conexión'
        : 'Error de conexión'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'system-ui, sans-serif',
        background: COLORS.background,
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: COLORS.surface,
          padding: '2.5rem',
          borderRadius: 16,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          width: '100%',
          maxWidth: 400,
          border: '1px solid #e2e8f0',
        }}
      >
        <h1 style={{ margin: '0 0 0.25rem', color: COLORS.primary, fontSize: '1.75rem', fontWeight: 800, textAlign: 'center' }}>
          TigreTrack
        </h1>
        <p style={{ margin: '0 0 1.5rem', color: COLORS.textSecondary, fontSize: '0.9rem', textAlign: 'center' }}>
          Inicia sesión para gestionar tus eventos
        </p>

        {error && (
          <p style={{ background: '#fee2e2', color: COLORS.secondary, padding: '0.6rem', borderRadius: 6, marginBottom: '1rem', fontSize: '0.85rem', border: '1px solid #fecaca' }}>
            {error}
          </p>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: '0.9rem', color: COLORS.textPrimary }}>Correo</label>
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            required
            style={{ width: '100%', padding: '0.7rem', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: '0.9rem', color: COLORS.textPrimary }}>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '0.7rem', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.8rem',
            background: loading ? '#94a3b8' : COLORS.primary,
            color: COLORS.white,
            border: 'none',
            borderRadius: 6,
            fontSize: '1rem',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s ease',
          }}
        >
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </div>
  )
}
