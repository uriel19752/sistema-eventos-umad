import React, { useState } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'

const COLORS = {
  primary: '#1e3a8a',
  secondary: '#dc2626',
  background: '#f8fafc',
  surface: '#ffffff',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  white: '#ffffff',
  accent: '#facc15'
}

function Evaluar() {
  const { id } = useParams<{ id: string }>()
  const [rating, setRating] = useState<number>(0)
  const [comment, setComment] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (rating === 0) {
      setError('Por favor, selecciona una calificación')
      return
    }

    setLoading(true)
    setError(null)

    try {
      await axios.post('/api/encuestas', {
        solicitud_id: id,
        calificacion: rating,
        comentarios: comment,
      })
      setSubmitted(true)
    } catch (err) {
      console.error('Error submitting survey:', err)
      const msg = axios.isAxiosError(err) 
        ? err.response?.data?.error || 'Ocurrió un error al enviar tu evaluación' 
        : 'Error de conexión'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={styles.successIcon}>✓</div>
          <h1 style={styles.title}>¡Muchas gracias!</h1>
          <p style={styles.text}>
            Tu respuesta ha sido registrada para Comunicación y Marketing Digital.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Evaluación de Evento</h1>
        <p style={styles.subtitle}>Tu opinión es muy valiosa para mejorar nuestros procesos.</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.section}>
            <label style={styles.label}>¿Cómo calificarías el servicio?</label>
            <div style={styles.starContainer}>
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setRating(num)}
                  style={{
                    ...styles.starButton,
                    backgroundColor: rating >= num ? COLORS.accent : '#cbd5e1',
                    color: rating >= num ? '#1e293b' : '#64748b',
                    transform: rating === num ? 'scale(1.2)' : 'scale(1)',
                  }}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.section}>
            <label style={styles.label}>Comentarios o Retroalimentación</label>
            <textarea
              style={styles.textarea}
              rows={4}
              placeholder="Escribe aquí tus sugerencias o comentarios..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </div>

          {error && <p style={styles.errorText}>{error}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{
              ...styles.submitButton,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Enviando...' : 'Enviar Evaluación'}
          </button>
        </form>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
    color: '#1e293b',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    padding: '1rem',
  },
  card: {
    backgroundColor: '#ffffff',
    padding: '2.5rem',
    borderRadius: '16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    width: '100%',
    maxWidth: '450px',
    textAlign: 'center',
    border: '1px solid #e2e8f0',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: '800',
    marginBottom: '0.5rem',
    color: '#1e3a8a',
  },
  subtitle: {
    fontSize: '0.95rem',
    color: '#64748b',
    marginBottom: '2rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    textAlign: 'left',
  },
  label: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#1e293b',
  },
  starContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '0.5rem',
  },
  starButton: {
    width: '45px',
    height: '45px',
    borderRadius: '50%',
    border: 'none',
    fontSize: '1.1rem',
    fontWeight: 'bold',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
  },
  textarea: {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '6px',
    border: '1px solid #cbd5e1',
    backgroundColor: '#ffffff',
    color: '#1e293b',
    fontSize: '0.95rem',
    fontFamily: 'inherit',
    resize: 'vertical',
    outline: 'none',
  },
  submitButton: {
    backgroundColor: '#1e3a8a',
    color: '#ffffff',
    padding: '1rem',
    borderRadius: '6px',
    border: 'none',
    fontSize: '1rem',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    marginTop: '1rem',
    cursor: 'pointer',
  },
  errorText: {
    color: '#dc2626',
    fontSize: '0.85rem',
    textAlign: 'center',
    margin: '0',
    fontWeight: 500,
  },
  successIcon: {
    fontSize: '3rem',
    color: '#16a34a',
    marginBottom: '1rem',
    fontWeight: 'bold',
  },
  text: {
    fontSize: '1rem',
    color: '#64748b',
    lineHeight: '1.5',
  },
}

export default Evaluar
