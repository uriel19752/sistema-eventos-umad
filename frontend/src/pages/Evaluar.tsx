import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import { MessageSquare, Send, Star } from 'lucide-react'

const CRITERIOS = [
  {
    key: 'puntualidad' as const,
    label: 'Puntualidad',
    desc: '¿El equipo llegó a tiempo y cumplió los horarios pactados?',
  },
  {
    key: 'calidadTecnica' as const,
    label: 'Calidad Técnica',
    desc: '¿La calidad del material audiovisual y cobertura fue adecuada?',
  },
  {
    key: 'atencionStaff' as const,
    label: 'Atención del Staff',
    desc: '¿El trato del personal fue cordial y profesional?',
  },
  {
    key: 'satisfaccionGral' as const,
    label: 'Satisfacción General',
    desc: '¿Cómo calificarías la experiencia global del servicio?',
  },
]

type CriterioKey = (typeof CRITERIOS)[number]['key']
type FormState = Record<CriterioKey, number>

const INITIAL_FORM: FormState = {
  puntualidad: 0,
  calidadTecnica: 0,
  atencionStaff: 0,
  satisfaccionGral: 0,
}

export default function Evaluar() {
  const { id } = useParams<{ id: string }>()
  const [nombreEvento, setNombreEvento] = useState('Cargando información del evento...')
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [hover, setHover] = useState<FormState>(INITIAL_FORM)
  const [comentarios, setComentarios] = useState('')
  const [enviado, setEnviado] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    async function obtenerDetallesEvento() {
      try {
        const res = await axios.get(`/api/solicitudes/publico/${id}`)
        setNombreEvento(res.data.nombreEvento)
      } catch {
        setNombreEvento('Evaluación de Cobertura Institucional')
      }
    }
    if (id) obtenerDetallesEvento()
  }, [id])

  function setCriterio(key: CriterioKey, val: number) {
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  function setHoverVal(key: CriterioKey, val: number) {
    setHover((prev) => ({ ...prev, [key]: val }))
  }

  async function handleEnviarEncuesta(e: React.FormEvent) {
    e.preventDefault()

    const todosValidos = CRITERIOS.every((c) => form[c.key] > 0)
    if (!todosValidos) {
      setError('Por favor califica todos los criterios antes de enviar.')
      return
    }

    setLoading(true)
    setError('')

    try {
      await axios.post('/api/encuestas', {
        solicitud_id: Number(id),
        puntualidad: form.puntualidad,
        calidadTecnica: form.calidadTecnica,
        atencionStaff: form.atencionStaff,
        satisfaccionGral: form.satisfaccionGral,
        comentarios: comentarios.trim() || null,
      })
      setEnviado(true)
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error ?? 'Error al enviar'
        : 'Error de conexión'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (enviado) {
    return (
      <div style={containerStyle}>
        <style>{`
          @keyframes scaleIn { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }
          @keyframes starPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.15); } }
          .success-card { animation: scaleIn 0.45s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
          .success-star { animation: starPulse 1.5s ease-in-out infinite; }
        `}</style>
        <div className="success-card" style={{
          ...cardStyle,
          textAlign: 'center',
          padding: '3rem 2.5rem',
        }}>
          <div style={{
            width: '72px',
            height: '72px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            boxShadow: '0 8px 24px -4px rgba(245,158,11,0.35)',
          }}>
            <Star size={34} fill="#FFFFFF" color="#FFFFFF" strokeWidth={1.5} className="success-star" />
          </div>

          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '0.75rem',
          }}>
            <span style={{ fontSize: '1.5rem' }}>🐾</span>
            <span style={{
              fontSize: '0.65rem',
              fontWeight: 800,
              color: '#1E3A8A',
              textTransform: 'uppercase',
              letterSpacing: '0.2em',
            }}>
              TigreTrack UMAD
            </span>
          </div>

          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: 900,
            color: '#0F172A',
            margin: '0 0 0.5rem',
            letterSpacing: '-0.02em',
            lineHeight: 1.3,
          }}>
            ¡Gracias por tu evaluación!
          </h1>

          <p style={{
            color: '#475569',
            fontSize: '0.9rem',
            lineHeight: 1.7,
            margin: '0 auto 1.5rem',
            maxWidth: '380px',
            fontWeight: 500,
          }}>
            Tu opinión nos ayuda a crecer como equipo y a mejorar la calidad de cobertura en cada rincón del campus. ¡Cada estrella cuenta para ser mejores!
          </p>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '0.35rem',
          }}>
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} size={20} fill="#F59E0B" color="#F59E0B" strokeWidth={1.5} aria-hidden="true" />
            ))}
          </div>

          <div style={{
            marginTop: '1.5rem',
            padding: '0.75rem 1rem',
            background: 'rgba(30,58,138,0.04)',
            borderRadius: '10px',
            border: '1px solid rgba(30,58,138,0.08)',
          }}>
            <p style={{ margin: 0, fontSize: '0.78rem', color: '#1E3A8A', fontWeight: 600, lineHeight: 1.5 }}>
              Departamento de Comunicación · UMAD
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .eval-card { animation: fadeInUp 0.5s ease forwards; }
        .star-btn { transition: transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1); }
        .star-btn:hover { transform: scale(1.18); }
        .star-btn:active { transform: scale(0.82) !important; }
        @media (max-width: 480px) {
          .eval-card { padding: 1.5rem !important; }
        }
      `}</style>
      <div className="eval-card" style={cardStyle}>
        {/* Header institucional flotante */}
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.3rem 0.9rem',
            borderRadius: '9999px',
            background: 'rgba(30,58,138,0.08)',
            border: '1px solid rgba(30,58,138,0.15)',
            marginBottom: '1rem',
          }}>
            <span style={{
              width: '6px', height: '6px', borderRadius: '50%',
              background: '#E11D48', display: 'inline-block',
            }} />
            <span style={{
              fontSize: '0.65rem', fontWeight: 800, color: '#1E3A8A',
              textTransform: 'uppercase', letterSpacing: '0.12em',
            }}>
              TigreTrack
            </span>
          </div>

          <h1 style={{
            margin: 0,
            fontSize: '1.3rem',
            fontWeight: 900,
            color: '#0F172A',
            letterSpacing: '-0.02em',
            lineHeight: 1.3,
          }}>
            Encuesta de Satisfacción
          </h1>

          <p style={{
            margin: '0.35rem 0 0',
            fontSize: '0.9rem',
            color: '#475569',
            fontWeight: 500,
            lineHeight: 1.5,
          }}>
            {nombreEvento}
          </p>
        </div>

        <div style={{
          background: '#EFF6FF',
          borderRadius: '12px',
          border: '1px solid rgba(37,99,235,0.12)',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
          fontSize: '0.9rem',
          color: '#334155',
          lineHeight: 1.6,
          fontWeight: 500,
        }}>
          ¡Tu opinión hace la diferencia! 🐾 En el departamento de Comunicación de la UMAD nos tomamos muy en serio tus comentarios. Tus respuestas nos ayudan a optimizar la logística, el equipo técnico y la atención de los futuros eventos en el campus.
        </div>

        <p style={{
          textAlign: 'center',
          fontStyle: 'italic',
          color: '#64748B',
          fontSize: '0.8rem',
          margin: '0 0 1.25rem',
          fontWeight: 500,
        }}>
          Nota: 1 estrella representa la calificación más baja (Deficiente) y 5 estrellas la calificación más alta (Excelente).
        </p>

        {error && (
          <div role="alert" style={{ background: '#FEE2E2', color: '#E11D48', padding: '0.75rem 1rem', borderRadius: '12px', marginBottom: '1.5rem', fontWeight: 600, fontSize: '0.85rem', textAlign: 'center', border: '1px solid rgba(225,29,72,0.15)' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleEnviarEncuesta} aria-label="Formulario de evaluación" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: '1rem',
          }}>
            {CRITERIOS.map((c) => (
              <div key={c.key} style={{
                background: '#FAFBFC',
                borderRadius: '12px',
                padding: '0.85rem 1rem',
                border: '1px solid #F1F5F9',
              }}>
                <div style={{ marginBottom: '0.4rem' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}>
                    {c.label}
                  </div>
                  <div style={{ fontSize: '0.72rem', fontWeight: 500, color: '#64748B', marginTop: '0.1rem' }}>
                    {c.desc}
                  </div>
                </div>
                <div role="group" aria-label={`Calificación para ${c.label}`} style={{ display: 'flex', justifyContent: 'center', gap: '0.3rem', marginTop: '0.5rem' }}>
                  {[1, 2, 3, 4, 5].map((n) => {
                    const activa = n <= (hover[c.key] || form[c.key])
                    return (
                      <button
                        key={n}
                        type="button"
                        aria-label={`${n} estrella${n > 1 ? 's' : ''} — ${n === 1 ? 'Deficiente' : n === 2 ? 'Regular' : n === 3 ? 'Aceptable' : n === 4 ? 'Buena' : 'Excelente'}`}
                        aria-pressed={form[c.key] === n}
                        onClick={() => setCriterio(c.key, n)}
                        onMouseEnter={() => setHoverVal(c.key, n)}
                        onMouseLeave={() => setHoverVal(c.key, 0)}
                        className="star-btn"
                        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', lineHeight: 0 }}
                      >
                        <Star
                          size={28}
                          fill={activa ? '#F59E0B' : 'transparent'}
                          color={activa ? '#F59E0B' : '#E2E8F0'}
                          strokeWidth={activa ? 1.5 : 1.8}
                          style={{ transition: 'all 0.2s ease', filter: activa ? 'drop-shadow(0 2px 6px rgba(245,158,11,0.35))' : 'none' }}
                        />
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem' }}>
              <MessageSquare size={14} color="#64748B" />
              <label htmlFor="comentarios-evaluacion" style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Comentarios o Sugerencias
                <span style={{ fontWeight: 400, color: '#94A3B8', textTransform: 'none' }}> (opcional)</span>
              </label>
            </div>
            <textarea
              id="comentarios-evaluacion"
              value={comentarios}
              onChange={(e) => setComentarios(e.target.value)}
              placeholder="Comparte tu experiencia para ayudarnos a mejorar..."
              rows={3}
              style={{
                width: '100%', padding: '0.75rem 1rem', borderRadius: '12px', border: '1px solid #CBD5E1', fontSize: '0.9rem', fontWeight: 500, color: '#0F172A', backgroundColor: '#FFFFFF', fontFamily: 'inherit', boxSizing: 'border-box', transition: 'all 0.2s ease', resize: 'vertical',
              }}
              onFocus={(e) => { e.target.style.borderColor = '#2563EB'; e.target.style.boxShadow = '0 0 0 4px rgba(37,99,235,0.12)' }}
              onBlur={(e) => { e.target.style.borderColor = '#CBD5E1'; e.target.style.boxShadow = 'none' }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              padding: '0.85rem 2rem',
              background: loading ? '#94A3B8' : '#1E3A8A',
              color: '#FFF', border: 'none', borderRadius: '12px',
              fontSize: '0.95rem', fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              boxShadow: loading ? 'none' : '0 8px 20px -5px rgba(30,58,138,0.3)',
              transition: 'all 0.2s ease', letterSpacing: '0.02em',
            }}
          >
            <Send size={16} />
            {loading ? 'Enviando encuesta...' : 'Enviar Evaluación'}
          </button>
        </form>
      </div>
    </div>
  )
}

const containerStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  background: 'linear-gradient(160deg, #F0F4F8 0%, #EFF6FF 100%)',
  padding: '1.5rem',
  boxSizing: 'border-box',
  fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
}

const cardStyle: React.CSSProperties = {
  background: '#FFFFFF',
  borderRadius: '20px',
  border: '1px solid #E2E8F0',
  boxShadow: '0 25px 50px -12px rgba(15,23,42,0.15), 0 4px 16px -4px rgba(15,23,42,0.04)',
  padding: '2.5rem',
  maxWidth: '520px',
  width: '100%',
  boxSizing: 'border-box',
}
