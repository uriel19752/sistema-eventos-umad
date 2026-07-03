import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import axios from 'axios'

export default function CancelarSolicitudView() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const id = searchParams.get('id')

  const [nombreEvento, setNombreEvento] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [motivo, setMotivo] = useState('')

  useEffect(() => {
    if (!id) {
      setError('No se proporcionó un ID de solicitud.')
      setLoading(false)
      return
    }
    axios
      .get(`/api/solicitudes/${id}`)
      .then((res) => setNombreEvento(res.data.nombreEvento))
      .catch(() => setError('No se pudo obtener la información de la solicitud.'))
      .finally(() => setLoading(false))
  }, [id])

  const handleCancel = async () => {
    if (!id) return
    setCancelling(true)
    setError('')
    try {
      await axios.patch(`/api/solicitudes/${id}/estado`, {
        estado: 'Cancelada',
        motivo: motivo.trim() || undefined,
      })
      setDone(true)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cancelar la solicitud.')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9' }}>
        <p style={{ color: '#64748b' }}>Cargando información...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f1f5f9', padding: '20px' }}>
      <div style={{ maxWidth: '480px', width: '100%', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 24px rgba(0,0,0,0.1)', padding: '32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ width: '64px', height: '64px', background: '#fef2f2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </div>
          <h1 style={{ margin: '0 0 8px', fontSize: '22px', fontWeight: 700, color: '#0f172a' }}>Cancelar Solicitud</h1>
        </div>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px', marginBottom: '16px', color: '#991b1b', fontSize: '14px' }}>
            {error}
          </div>
        )}

        {done ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: '64px', height: '64px', background: '#f0fdf4', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>Solicitud Cancelada</h2>
            <p style={{ color: '#475569', margin: '0 0 20px' }}>La solicitud ha sido cancelada exitosamente.</p>
            <button
              onClick={() => navigate('/dashboard')}
              style={{ background: '#1e3a8a', color: '#fff', border: 'none', padding: '10px 24px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}
            >
              Ir al Dashboard
            </button>
          </div>
        ) : (
          <>
            <p style={{ color: '#475569', margin: '0 0 20px', fontSize: '14px', lineHeight: 1.5 }}>
              {nombreEvento
                ? `Estás a punto de cancelar la solicitud del evento "${nombreEvento}".`
                : '¿Estás seguro de que deseas cancelar esta solicitud?'}
              <br />
              Esta acción no se puede deshacer.
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontWeight: 600, color: '#0f172a', fontSize: '13px' }}>
                Motivo de cancelación <span style={{ color: '#94a3b8' }}>(opcional)</span>
              </label>
              <textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Describe el motivo de la cancelación..."
                rows={3}
                style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '14px', resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => navigate('/dashboard')}
                style={{ flex: 1, background: '#f1f5f9', color: '#0f172a', border: '1px solid #cbd5e1', padding: '10px', borderRadius: '6px', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}
              >
                Regresar
              </button>
              <button
                onClick={handleCancel}
                disabled={cancelling}
                style={{ flex: 1, background: '#dc2626', color: '#fff', border: 'none', padding: '10px', borderRadius: '6px', fontWeight: 600, cursor: cancelling ? 'not-allowed' : 'pointer', fontSize: '14px', opacity: cancelling ? 0.7 : 1 }}
              >
                {cancelling ? 'Cancelando...' : 'Confirmar Cancelación'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
