import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { QRCodeCanvas } from 'qrcode.react'

interface CatalogoItem {
  id: number
  nombre: string
}

export default function NuevaSolicitud() {
  const [nombreEvento, setNombreEvento] = useState('')
  const [institucionId, setInstitucionId] = useState('')
  const [plantelId, setPlantelId] = useState('')
  const [fechaEvento, setFechaEvento] = useState('')
  const [horaInicio, setHoraInicio] = useState('')
  const [responsable, setResponsable] = useState('')
  const [generarQR, setGenerarQR] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [idSolicitudCreada, setIdSolicitudCreada] = useState<number | null>(null)

  const [instituciones, setInstituciones] = useState<CatalogoItem[]>([])
  const [planteles, setPlanteles] = useState<CatalogoItem[]>([])
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true)

  const qrRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function cargarCatalogos() {
      try {
        const res = await axios.get('/api/catalogos')
        setInstituciones(res.data.instituciones)
        setPlanteles(res.data.planteles)
      } catch {
        setError('Error al cargar catálogos')
      } finally {
        setCargandoCatalogos(false)
      }
    }
    cargarCatalogos()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setIdSolicitudCreada(null)

    if (!fechaEvento) {
      setError('Selecciona una fecha para el evento')
      return
    }

    const fechaSel = new Date(fechaEvento)
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)

    const fechaMinima = new Date(hoy)
    fechaMinima.setDate(fechaMinima.getDate() + 7)

    if (fechaSel < fechaMinima) {
      setError(`La fecha debe ser al menos 7 días después de hoy (mín: ${fechaMinima.toISOString().split('T')[0]})`)
      return
    }

    setLoading(true)

    try {
      const folio = `EVT-${Date.now()}`

      const res = await axios.post('/api/solicitudes', {
        folio,
        nombreEvento,
        plantelId: Number(plantelId),
        institucionId: Number(institucionId),
        fechaEvento,
        horaInicio,
        horaFin: horaInicio,
        responsableNombre: responsable,
      })

      const id = res.data.id

      if (generarQR) {
        setIdSolicitudCreada(id)
      } else {
        setIdSolicitudCreada(id)
      }

      setNombreEvento('')
      setInstitucionId('')
      setPlantelId('')
      setFechaEvento('')
      setHoraInicio('')
      setResponsable('')
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error ?? 'Error al enviar la solicitud'
        : 'Error de conexión'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  function descargarQR() {
    const canvas = qrRef.current?.querySelector('canvas')
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    const a = document.createElement('a')
    a.href = url
    a.download = `qr-encuesta-${idSolicitudCreada}.png`
    a.click()
  }

  const qrUrl = idSolicitudCreada ? `http://localhost:5173/evaluar/${idSolicitudCreada}` : ''

  return (
    <div style={{ maxWidth: 480, margin: '2rem auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ color: '#1e3a5f' }}>Nueva Solicitud de Evento</h1>

      {error && (
        <p style={{ background: '#f8d7da', color: '#721c24', padding: '0.75rem', borderRadius: 6 }}>
          {error}
        </p>
      )}

      {cargandoCatalogos ? (
        <p style={{ color: '#555' }}>Cargando formulario...</p>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Nombre del evento</label>
            <input
              type="text"
              value={nombreEvento}
              onChange={(e) => setNombreEvento(e.target.value)}
              required
              style={{ width: '100%', padding: '0.5rem', borderRadius: 4, border: '1px solid #ccc' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Institución</label>
            <select
              value={institucionId}
              onChange={(e) => setInstitucionId(e.target.value)}
              required
              style={{ width: '100%', padding: '0.5rem', borderRadius: 4, border: '1px solid #ccc' }}
            >
              <option value="">Seleccionar...</option>
              {instituciones.map((i) => (
                <option key={i.id} value={i.id}>{i.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Plantel</label>
            <select
              value={plantelId}
              onChange={(e) => setPlantelId(e.target.value)}
              required
              style={{ width: '100%', padding: '0.5rem', borderRadius: 4, border: '1px solid #ccc' }}
            >
              <option value="">Seleccionar...</option>
              {planteles.map((p) => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Fecha del evento</label>
            <input
              type="date"
              value={fechaEvento}
              onChange={(e) => setFechaEvento(e.target.value)}
              required
              style={{ width: '100%', padding: '0.5rem', borderRadius: 4, border: '1px solid #ccc' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Hora de inicio</label>
            <input
              type="time"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              required
              style={{ width: '100%', padding: '0.5rem', borderRadius: 4, border: '1px solid #ccc' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, marginBottom: 4 }}>Responsable</label>
            <input
              type="text"
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
              required
              style={{ width: '100%', padding: '0.5rem', borderRadius: 4, border: '1px solid #ccc' }}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={generarQR}
              onChange={(e) => setGenerarQR(e.target.checked)}
            />
            ¿Desea generar encuesta de satisfacción por QR?
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '0.75rem',
              background: loading ? '#6c757d' : '#1e3a5f',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: '1rem',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Enviando...' : 'Registrar solicitud'}
          </button>
        </form>
      )}

      {idSolicitudCreada && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={() => setIdSolicitudCreada(null)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: '2rem',
              textAlign: 'center',
              maxWidth: 320,
              boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 0.5rem', color: '#1e3a5f' }}>Solicitud registrada</h3>
            <p style={{ margin: '0 0 1rem', color: '#555', fontSize: '0.85rem' }}>
              Folio: EVT-...
            </p>

            {generarQR && (
              <>
                <div ref={qrRef} style={{ marginBottom: '1rem' }}>
                  <QRCodeCanvas value={qrUrl} size={180} />
                </div>
                <p style={{ fontSize: '0.8rem', color: '#555', marginBottom: '0.75rem' }}>
Escanea para evaluar el evento
                </p>
                <button
                  onClick={descargarQR}
                  style={{
                    background: '#1e3a5f',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '0.5rem 1.25rem',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    marginRight: '0.5rem',
                  }}
                >
                  Descargar QR
                </button>
              </>
            )}

            <button
              onClick={() => setIdSolicitudCreada(null)}
              style={{
                background: '#6c757d',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                padding: '0.5rem 1.25rem',
                fontSize: '0.9rem',
                cursor: 'pointer',
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
