import { useState } from 'react'
import axios from 'axios'
import { GoogleLogin } from '@react-oauth/google'
import '../index.css'

interface Props {
  onLogin: (usuario: { id: number; correo: string; rol: string; token: string }) => void
}

export default function Login({ onLogin }: Props) {
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [nombre, setNombre] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function resetForm() {
    setError('')
    setNombre('')
    setEmail('')
    setPassword('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (mode === 'login') {
        const res = await axios.post('/api/auth/login', { email, password })
        const { usuario, token } = res.data
        localStorage.setItem('token', token)
        onLogin({ id: usuario.id, correo: usuario.email, rol: usuario.rol, token })
      } else {
        await axios.post('/api/auth/signup', { nombre, email, password })
        const res = await axios.post('/api/auth/login', { email, password })
        const { usuario, token } = res.data
        localStorage.setItem('token', token)
        onLogin({ id: usuario.id, correo: usuario.email, rol: usuario.rol, token })
      }
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error ?? 'Error de conexión'
        : 'Error de conexión'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogleSuccess(credential: string) {
    try {
      const res = await axios.post('/api/auth/google', { token: credential })
      const { usuario, token } = res.data
      localStorage.setItem('token', token)
      onLogin({ id: usuario.id, correo: usuario.email, rol: usuario.rol, token })
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error ?? 'Error de autenticación con Google'
        : 'Error de conexión'
      setError(msg)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      fontFamily: `'Inter', system-ui, -apple-system, sans-serif`,
      background: '#F0F4F8',
    }}>
      {/* ===== PANEL IZQUIERDO — Branding ===== */}
      <div style={{
        width: '420px', flexShrink: 0,
        background: 'linear-gradient(160deg, #1E3A8A 0%, #0F2560 100%)',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        padding: '3rem 2.5rem 2.5rem',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: '-120px', right: '-80px',
          width: '420px', height: '420px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(225,29,72,0.12) 0%, transparent 70%)',
          filter: 'blur(60px)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-100px', left: '-60px',
          width: '300px', height: '300px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.05) 0%, transparent 70%)',
          filter: 'blur(50px)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', top: '40%', left: '-120px',
          width: '280px', height: '280px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)',
          filter: 'blur(60px)', pointerEvents: 'none',
        }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.85rem',
            marginBottom: '3rem',
          }}>
            <div style={{
              width: '46px', height: '46px', borderRadius: '14px',
              background: 'linear-gradient(135deg, #E11D48, #BE123C)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 24px rgba(225,29,72,0.3)',
            }}>
              <span style={{
                color: 'white', fontSize: '1.3rem', fontWeight: 900,
                fontFamily: 'Inter, sans-serif',
              }}>T</span>
            </div>
            <div>
              <span style={{
                color: 'white', fontSize: '1.4rem', fontWeight: 800,
                letterSpacing: '-0.02em', fontFamily: 'Inter, sans-serif',
              }}>TigreTrack</span>
              <div style={{
                fontSize: '0.55rem', fontWeight: 700,
                color: 'rgba(255,255,255,0.4)',
                letterSpacing: '0.08em', textTransform: 'uppercase',
                marginTop: '0.1rem', fontFamily: 'Inter, sans-serif',
              }}>
                Plataforma UMAD
              </div>
            </div>
          </div>
          <h2 style={{
            color: 'white', fontSize: '2rem', fontWeight: 800,
            lineHeight: 1.15, margin: '0 0 0.75rem',
            letterSpacing: '-0.03em', fontFamily: 'Inter, sans-serif',
          }}>
            Gestión de Eventos Institucionales
          </h2>
          <p style={{
            color: 'rgba(255,255,255,0.5)', fontSize: '0.9rem',
            lineHeight: 1.65, margin: 0, fontWeight: 400,
          }}>
            Plataforma oficial de cobertura y seguimiento de eventos de la UMAD
          </p>
        </div>
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '0.85rem',
          position: 'relative', zIndex: 1,
        }}>
          {[
            { label: 'Solicitudes gestionadas', value: '100%', sub: 'trazabilidad completa' },
            { label: 'QR automático', value: '\u2713', sub: 'por evento registrado' },
            { label: 'Encuestas en tiempo real', value: '\u2605', sub: 'calidad de cobertura' },
          ].map((item) => (
            <div key={item.label} style={{
              display: 'flex', alignItems: 'center', gap: '1rem',
              padding: '0.9rem 1.15rem', borderRadius: '12px',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
              backdropFilter: 'blur(4px)',
            }}>
              <span style={{
                fontSize: '1.15rem', fontWeight: 800, color: '#E11D48',
                minWidth: '32px', textAlign: 'center',
              }}>
                {item.value}
              </span>
              <div>
                <div style={{ color: 'white', fontSize: '0.82rem', fontWeight: 600 }}>
                  {item.label}
                </div>
                <div style={{
                  color: 'rgba(255,255,255,0.4)', fontSize: '0.7rem',
                  marginTop: '0.1rem',
                }}>
                  {item.sub}
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{
          position: 'relative', zIndex: 1,
          color: 'rgba(255,255,255,0.25)', fontSize: '0.7rem',
          fontWeight: 500, fontFamily: 'Inter, sans-serif',
        }}>
          &copy; {new Date().getFullYear()} Universidad Mexicana &mdash; UMAD
        </div>
      </div>

      {/* ===== PANEL DERECHO — Formulario ===== */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '2rem',
      }}>
        <div style={{ width: '100%', maxWidth: '420px' }}>
          <div style={{ marginBottom: '2rem' }}>
            <span style={{
              display: 'inline-block', width: '32px', height: '3px',
              borderRadius: '2px', background: '#E11D48', marginBottom: '0.75rem',
            }} />
            <p style={{
              margin: '0 0 0.3rem', fontSize: '0.7rem', fontWeight: 800,
              color: '#E11D48', textTransform: 'uppercase', letterSpacing: '0.12em',
              fontFamily: 'Inter, sans-serif',
            }}>
              {mode === 'login' ? 'Acceso al sistema' : 'Crear cuenta'}
            </p>
            <h1 style={{
              margin: '0', fontSize: '2.5rem', fontWeight: 800,
              color: '#0F172A', letterSpacing: '-0.03em',
              fontFamily: 'Inter, sans-serif',
            }}>
              {mode === 'login' ? 'Bienvenido' : 'Regístrate'}
            </h1>
            <p style={{
              margin: '0.5rem 0 0', color: '#64748B', fontSize: '0.925rem',
              fontWeight: 400,
            }}>
              {mode === 'login'
                ? 'Ingresa tus credenciales para continuar'
                : 'Completa tus datos para crear una cuenta'}
            </p>
          </div>

          {error && (
            <div style={{
              background: '#FFF1F2', color: '#E11D48',
              padding: '0.85rem 1rem', borderRadius: '10px',
              marginBottom: '1.5rem', fontSize: '0.85rem', fontWeight: 600,
              border: '1.5px solid #FECDD3',
              display: 'flex', alignItems: 'center', gap: '0.6rem',
            }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '22px', height: '22px', borderRadius: '50%',
                background: '#E11D48', color: 'white', fontSize: '0.75rem',
                fontWeight: 700, flexShrink: 0,
              }}>
                !
              </span>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column' }}>
            {mode === 'signup' && (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{
                  display: 'block', fontWeight: 700, marginBottom: '0.45rem',
                  fontSize: '0.7rem', color: '#374151',
                  textTransform: 'uppercase', letterSpacing: '0.04em',
                  fontFamily: 'Inter, sans-serif',
                }}>
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  placeholder="Tu nombre"
                  className="tt-input"
                  style={{ background: '#FAFBFC' }}
                />
              </div>
            )}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{
                display: 'block', fontWeight: 700, marginBottom: '0.45rem',
                fontSize: '0.7rem', color: '#374151',
                textTransform: 'uppercase', letterSpacing: '0.04em',
                fontFamily: 'Inter, sans-serif',
              }}>
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="usuario@umad.edu.mx"
                className="tt-input"
                style={{ background: '#FAFBFC' }}
              />
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{
                display: 'block', fontWeight: 700, marginBottom: '0.45rem',
                fontSize: '0.7rem', color: '#374151',
                textTransform: 'uppercase', letterSpacing: '0.04em',
                fontFamily: 'Inter, sans-serif',
              }}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder={'\u2022'.repeat(10)}
                className="tt-input"
                style={{ background: '#FAFBFC' }}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="tt-btn tt-btn-primary"
              style={{
                width: '100%', padding: '0.875rem', fontSize: '1rem',
                borderRadius: '10px', marginTop: '0.75rem',
              }}
            >
              {loading
                ? 'Procesando...'
                : mode === 'login'
                  ? 'Ingresar al sistema \u2192'
                  : 'Crear cuenta \u2192'}
            </button>
          </form>

          {/* Separador + Google */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '1rem',
            margin: '1.5rem 0',
          }}>
            <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
            <span style={{
              fontSize: '0.75rem', color: '#94A3B8', fontWeight: 600,
              whiteSpace: 'nowrap', textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              O entra con
            </span>
            <div style={{ flex: 1, height: '1px', background: '#E2E8F0' }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <GoogleLogin
              onSuccess={(credentialResponse) => {
                if (credentialResponse.credential) {
                  handleGoogleSuccess(credentialResponse.credential)
                }
              }}
              onError={() => setError('Error al autenticar con Google')}
              size="large"
              width="340"
              theme="outline"
              text="signin_with"
              shape="rectangular"
            />
          </div>

          {/* Toggle login/signup */}
          <div style={{
            marginTop: '1.75rem', textAlign: 'center',
            fontSize: '0.85rem', color: '#64748B',
          }}>
            {mode === 'login' ? (
              <>
                ¿No tienes cuenta?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('signup'); resetForm() }}
                  style={{
                    background: 'none', border: 'none', color: '#1E3A8A',
                    fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem',
                    fontFamily: 'Inter, sans-serif',
                    textDecoration: 'underline',
                    textUnderlineOffset: '2px',
                  }}
                >
                  Registrarse
                </button>
              </>
            ) : (
              <>
                ¿Ya tienes cuenta?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); resetForm() }}
                  style={{
                    background: 'none', border: 'none', color: '#1E3A8A',
                    fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem',
                    fontFamily: 'Inter, sans-serif',
                    textDecoration: 'underline',
                    textUnderlineOffset: '2px',
                  }}
                >
                  Iniciar sesión
                </button>
              </>
            )}
          </div>

          <div style={{
            marginTop: '2rem', padding: '1rem 1.25rem',
            background: 'rgba(30,58,138,0.04)',
            border: '1px solid rgba(30,58,138,0.1)',
            borderRadius: '10px', fontSize: '0.8rem',
            color: '#64748B', lineHeight: 1.5,
            fontFamily: 'Inter, sans-serif',
          }}>
            <strong style={{ color: '#1E3A8A', fontWeight: 700 }}>
              Acceso restringido.
            </strong>{' '}
            Solo personal autorizado de la UMAD puede ingresar a este sistema.
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          #root > div > div:first-child {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
