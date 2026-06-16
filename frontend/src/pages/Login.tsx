import { useState } from 'react'
import axios from 'axios'

interface Props {
  onLogin: (usuario: { id: number; correo: string; rol: string }) => void
}

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
        background: '#f0f2f5',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: '#fff',
          padding: '2.5rem',
          borderRadius: 12,
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
          width: '100%',
          maxWidth: 380,
        }}
      >
        <h1 style={{ margin: '0 0 0.25rem', color: '#1e3a5f' }}>Eventos UMAD / IMM</h1>
        <p style={{ margin: '0 0 1.5rem', color: '#666', fontSize: '0.9rem' }}>Inicia sesión para continuar</p>

        {error && (
          <p style={{ background: '#f8d7da', color: '#721c24', padding: '0.6rem', borderRadius: 6, marginBottom: '1rem' }}>
            {error}
          </p>
        )}

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: '0.9rem' }}>Correo</label>
          <input
            type="email"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            required
            style={{ width: '100%', padding: '0.6rem', borderRadius: 6, border: '1px solid #ccc', fontSize: '0.9rem' }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontWeight: 600, marginBottom: 4, fontSize: '0.9rem' }}>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '0.6rem', borderRadius: 6, border: '1px solid #ccc', fontSize: '0.9rem' }}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '0.7rem',
            background: loading ? '#6c757d' : '#1e3a5f',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: '1rem',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </div>
  )
}
