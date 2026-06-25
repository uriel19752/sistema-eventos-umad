import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { QRCodeCanvas } from 'qrcode.react'
import umadLogo from '../assets/logos/umad_logo.png'
import prepaUmadLogo from '../assets/logos/prepa_umad_logo.png'
import immLogo from '../assets/logos/imm_logo.png'

interface MaterialesForm {
  fotografias: boolean
  notaWeb: boolean
  banners: boolean
  otro: string
}

export default function NuevaSolicitud() {
  const [nombreEvento, setNombreEvento] = useState('')
  const [institucionId, setInstitucionId] = useState('1')
  const [plantelId, setPlantelId] = useState('1')
  const [fechaEvento, setFechaEvento] = useState('')
  const [horaInicio, setHoraInicio] = useState('')
  const [horaFin, setHoraFin] = useState('')
  const [horaMontaje, setHoraMontaje] = useState('')
  const [responsable, setResponsable] = useState('')
  const [area, setArea] = useState('')
  const [contacto, setContacto] = useState('')
  const [lugar, setLugar] = useState('UMAD')
  const [ubicacion, setUbicacion] = useState('')
  const [publico, setPublico] = useState('')
  const [autoridades, setAutoridades] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [objetivo, setObjetivo] = useState('')
  const [generarQR, setGenerarQR] = useState(false)
  
  const [materiales, setMateriales] = useState<MaterialesForm>({
    fotografias: false,
    notaWeb: false,
    banners: false,
    otro: ''
  })
  
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [idSolicitudCreada, setIdSolicitudCreada] = useState<number | null>(null)
  const [debeMostrarQRConfirmado, setDebeMostrarQRConfirmado] = useState(false)
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true)
  const qrRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function cargarCatalogos() {
      try {
        await axios.get('/api/catalogos')
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
      setError(`La solicitud debe enviarse con mínimo 7 días de anticipación (mín: ${fechaMinima.toISOString().split('T')[0]})`)
      return
    }

    console.log('[VALIDACION HORAS]', {
      horaMontaje,
      horaInicio,
      horaFin
    })

    if (horaFin <= horaInicio) {
      alert('La hora de finalización debe ser posterior a la hora de inicio.')
      setLoading(false)
      return
    }

    if (horaMontaje && horaMontaje > horaInicio) {
      alert('La hora de montaje debe ser anterior o igual a la hora de inicio.')
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const folio = `EVT-${Date.now()}`
      
      const normalizeTime = (timeStr: string) => {
        if (!timeStr) return '';
        if (timeStr.includes('AM') || timeStr.includes('PM')) {
          const [time, modifier] = timeStr.split(' ');
          let [hours, minutes] = time.split(':');
          if (hours === '12') hours = '00';
          if (modifier === 'PM') {
            hours = (parseInt(hours, 10) + 12).toString();
          }
          return `${hours.padStart(2, '0')}:${minutes}`;
        }
        return timeStr;
      };

      const res = await axios.post('/api/solicitudes', {
        folio,
        nombreEvento,
        plantelId: Number(plantelId),
        institucionId: Number(institucionId),
        fechaEvento,
        horaInicio: normalizeTime(horaInicio),
        horaFin: normalizeTime(horaFin),
        horaMontaje: normalizeTime(horaMontaje),
        responsableNombre: responsable,
        area,
        contacto,
        lugar,
        lugarSeleccionado: lugar,
        ubicacion,
        publico,
        autoridades,
        descripcion,
        objetivo,
        materiales,
        generarQR
      })
      const debeMostrar = generarQR
      setIdSolicitudCreada(res.data.id)
      setDebeMostrarQRConfirmado(debeMostrar)
      resetForm()
    } catch (err) {
      const msg = axios.isAxiosError(err) ? err.response?.data?.error ?? 'Error al enviar' : 'Error de conexión'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setNombreEvento(''); setInstitucionId('1'); setPlantelId('1'); setFechaEvento('');
    setHoraInicio(''); setHoraFin(''); setHoraMontaje(''); setResponsable(''); setArea(''); setContacto('');
    setLugar('UMAD'); setUbicacion(''); setPublico(''); setAutoridades(''); setDescripcion('');
    setObjetivo(''); setGenerarQR(false);
    setMateriales({ fotografias: false, notaWeb: false, banners: false, otro: '' });
  }

  function descargarQR() {
    setTimeout(() => {
      const canvas = qrRef.current?.querySelector('canvas')
      if (!canvas) return
      const url = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      a.download = `qr-encuesta-${idSolicitudCreada}.png`
      a.click()
    }, 100)
  }

  const COLORS = {
    primary: '#1e3a8a',
    secondary: '#dc2626',
    background: '#f8fafc',
    surface: '#ffffff',
    textPrimary: '#1e293b',
    textSecondary: '#64748b',
    white: '#ffffff',
    border: '#e2e8f0'
  }

  const sectionStyle: React.CSSProperties = {
    background: COLORS.surface,
    padding: '2rem',
    borderRadius: '12px',
    border: `1px solid ${COLORS.border}`,
    boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
    marginBottom: '2rem'
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontWeight: 600,
    marginBottom: '0.5rem',
    fontSize: '0.9rem',
    color: COLORS.textPrimary
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem',
    borderRadius: '6px',
    border: `1px solid ${COLORS.border}`,
    fontSize: '0.9rem',
    fontFamily: 'inherit'
  }

  const qrUrl = idSolicitudCreada ? `http://localhost:5173/evaluar/${idSolicitudCreada}` : ''

  return (
    <div style={{ maxWidth: '900px', margin: '3rem auto', padding: '0 1.5rem', fontFamily: 'system-ui, sans-serif', backgroundColor: COLORS.background, minHeight: '100vh' }}>
      <header style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '3rem',
          flexWrap: 'wrap',
          background: '#ffffff',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
          padding: '1rem 2rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{ width: '180px', height: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <img src={umadLogo} alt="UMAD" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          </div>
          <div style={{ width: '180px', height: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <img src={prepaUmadLogo} alt="Prepa UMAD" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          </div>
          <div style={{ width: '180px', height: '100px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <img src={immLogo} alt="IMM" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          </div>
        </div>
        <h1 style={{ color: COLORS.primary, fontSize: '2rem', fontWeight: 800, margin: '0 0 0.5rem' }}>TigreTrack — Solicitud de Cobertura de Evento</h1>
        <p style={{ color: COLORS.textSecondary, fontSize: '1.1rem', fontWeight: 500 }}>Área de Comunicación y Marketing Digital — UMAD</p>
      </header>

      {error && (
        <div style={{ background: '#fee2e2', color: COLORS.secondary, padding: '1rem', borderRadius: '8px', marginBottom: '2rem', border: '1px solid #fecaca', fontWeight: 500, textAlign: 'center' }}>
          {error}
        </div>
      )}

      {cargandoCatalogos ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: COLORS.textSecondary }}>Cargando formulario institucional...</div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={sectionStyle}>
            <h2 style={{ fontSize: '1.2rem', color: COLORS.primary, marginBottom: '1.5rem', borderBottom: `2px solid ${COLORS.primary}`, paddingBottom: '0.5rem' }}>1. Datos del Área Solicitante</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
              <div>
                <label style={labelStyle}>Área / Departamento</label>
                <input type="text" value={area} onChange={e => setArea(e.target.value)} required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Responsable del evento</label>
                <input type="text" value={responsable} onChange={e => setResponsable(e.target.value)} required style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>WhatsApp / Correo de contacto</label>
                <input type="text" value={contacto} onChange={e => setContacto(e.target.value)} required style={inputStyle} />
              </div>
            </div>
          </div>

          <div style={sectionStyle}>
            <h2 style={{ fontSize: '1.2rem', color: COLORS.primary, marginBottom: '1.5rem', borderBottom: `2px solid ${COLORS.primary}`, paddingBottom: '0.5rem' }}>2. Información del Evento</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
              <div>
                <label style={labelStyle}>Nombre del evento</label>
                <input type="text" value={nombreEvento} onChange={e => setNombreEvento(e.target.value)} required style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                <div>
                  <label style={labelStyle}>Fecha del evento</label>
                  <input type="date" value={fechaEvento} onChange={e => setFechaEvento(e.target.value)} required style={inputStyle} />
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Inicio</label>
                    <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} required style={inputStyle} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Término</label>
                    <input type="time" value={horaFin} onChange={e => setHoraFin(e.target.value)} required style={inputStyle} />
                  </div>
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                <label style={labelStyle}>Hora de requerimiento del lugar (Montaje / Preparativos)</label>
                <input type="time" value={horaMontaje} onChange={e => setHoraMontaje(e.target.value)} required style={inputStyle} />
                <p style={{ margin: '8px 0 0', fontSize: '0.85rem', color: COLORS.textSecondary, fontStyle: 'italic', lineHeight: '1.4' }}>
                  ⚠️ <strong>Nota de Logística:</strong> La "Hora de Inicio/Término" superior corresponde al programa oficial del evento. Este campo es para especificar desde qué momento requiere el acceso al espacio para preparativos, decoración o pruebas técnicas.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                <div>
                  <label style={labelStyle}>Lugar</label>
                  <select value={lugar} onChange={e => setLugar(e.target.value)} required style={inputStyle}>
                    <option value="UMAD">UMAD</option>
                    <option value="IMM Centro">IMM Centro</option>
                    <option value="IMM Zavaleta">IMM Zavaleta</option>
                    <option value="Lugar Externo">Lugar Externo</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Ubicación específica</label>
                  <input type="text" value={ubicacion} onChange={e => setUbicacion(e.target.value)} placeholder="Ej. Auditorio, Salón A..." style={inputStyle} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                <div>
                  <label style={labelStyle}>Público objetivo</label>
                  <input type="text" value={publico} onChange={e => setPublico(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Autoridades que asisten</label>
                  <input type="text" value={autoridades} onChange={e => setAutoridades(e.target.value)} style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Descripción del evento</label>
                <textarea value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
              </div>
            </div>
          </div>

          <div style={sectionStyle}>
            <h2 style={{ fontSize: '1.2rem', color: COLORS.primary, marginBottom: '1.5rem', borderBottom: `2px solid ${COLORS.primary}`, paddingBottom: '0.5rem' }}>3. Objetivo y Logística</h2>
            <div>
              <label style={labelStyle}>Objetivo de la cobertura (¿Qué desea comunicar/destacar la institución?)</label>
              <textarea value={objetivo} onChange={e => setObjetivo(e.target.value)} rows={4} style={{ ...inputStyle, resize: 'vertical' }} />
            </div>
          </div>

          <div style={sectionStyle}>
            <h2 style={{ fontSize: '1.2rem', color: COLORS.primary, marginBottom: '1.5rem', borderBottom: `2px solid ${COLORS.primary}`, paddingBottom: '0.5rem' }}>4. Material Requerido</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              {[
                { id: 'fotografias', label: 'Fotografías' },
                { id: 'notaWeb', label: 'Nota para sitio web' },
                { id: 'banners', label: 'Banners' },
              ].map(item => (
                <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.95rem', color: COLORS.textPrimary }}>
                  <input 
                    type="checkbox" 
                    checked={Boolean(materiales[item.id as keyof typeof materiales])} 
                    onChange={e => setMateriales({ ...materiales, [item.id]: e.target.checked })} 
                    style={{ width: '18px', height: '18px', accentColor: COLORS.primary }}
                  />
                  {item.label}
                </label>
              ))}
            </div>
            <div style={{ marginTop: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '0.95rem', color: COLORS.textPrimary }}>
                <input 
                  type="checkbox" 
                  checked={!!materiales.otro} 
                  onChange={e => setMateriales({ ...materiales, otro: e.target.checked ? ' ' : '' })}
                  style={{ width: '18px', height: '18px', accentColor: COLORS.primary }}
                />
                Otro:
              </label>
              <input 
                type="text" 
                value={materiales.otro} 
                onChange={e => setMateriales({ ...materiales, otro: e.target.value })} 
                placeholder="Especificar material..."
                style={{ ...inputStyle, flex: 1 }}
              />
            </div>
          </div>

          <div style={{ ...sectionStyle, background: '#f1f5f9', border: 'none' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={labelStyle}>Fecha de envío de solicitud</label>
                <input type="text" value={new Date().toLocaleDateString()} readOnly style={{ ...inputStyle, background: '#e2e8f0', cursor: 'not-allowed' }} />
              </div>
              <div>
                <label style={labelStyle}>Confirmación del Responsable</label>
                <input type="text" value={responsable} readOnly style={{ ...inputStyle, background: '#e2e8f0', cursor: 'not-allowed' }} />
              </div>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', fontSize: '1rem', fontWeight: 600, color: COLORS.textPrimary, marginBottom: '1.5rem' }}>
              <input 
                type="checkbox" 
                checked={generarQR} 
                onChange={e => setGenerarQR(e.target.checked)} 
                style={{ width: '20px', height: '20px', accentColor: COLORS.primary }}
              />
              ¿Desea generar encuesta de satisfacción por QR?
            </label>
            <div style={{ background: '#fff1f2', color: COLORS.secondary, padding: '1rem', borderRadius: '8px', borderLeft: `4px solid ${COLORS.secondary}`, fontSize: '0.9rem', fontWeight: 600, textAlign: 'center' }}>
              ⚠️ Esta solicitud deberá enviarse con mínimo 7 días naturales de anticipación.
            </div>
          </div>

          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '1rem 3rem',
                background: loading ? '#94a3b8' : COLORS.primary,
                color: COLORS.white,
                border: 'none',
                borderRadius: '8px',
                fontSize: '1.1rem',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(30, 58, 138, 0.3)',
                transition: 'all 0.2s ease'
              }}
            >
              {loading ? 'Procesando...' : 'Registrar Solicitud en TigreTrack'}
            </button>
          </div>
        </form>
      )}

      {idSolicitudCreada && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => setIdSolicitudCreada(null)}
        >
          <div
            style={{
              background: COLORS.surface,
              borderRadius: '16px',
              padding: '2.5rem',
              textAlign: 'center',
              maxWidth: 350,
              boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ color: '#16a34a', fontSize: '3rem', marginBottom: '1rem' }}>✓</div>
            <h3 style={{ margin: '0 0 0.5rem', color: COLORS.primary, fontSize: '1.5rem', fontWeight: 700 }}>Solicitud Registrada</h3>
            <p style={{ margin: '0 0 1.5rem', color: COLORS.textSecondary, fontSize: '0.9rem' }}>
              Su solicitud ha sido enviada exitosamente al sistema TigreTrack.
            </p>
            {debeMostrarQRConfirmado && (
              <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.5rem' }}>
                <div ref={qrRef} style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                  <QRCodeCanvas value={qrUrl} size={180} />
                </div>
                <p style={{ fontSize: '0.85rem', color: COLORS.textSecondary, marginBottom: '1rem' }}>
                  Escanea este código para generar la encuesta de satisfacción
                </p>
                <button
                  onClick={descargarQR}
                  style={{
                    background: COLORS.primary,
                    color: COLORS.white,
                    border: 'none',
                    borderRadius: '6px',
                    padding: '0.6rem 1.2rem',
                    fontSize: '0.9rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  Descargar Código QR
                </button>
              </div>
            )}
            <button
          onClick={() => { setIdSolicitudCreada(null); setDebeMostrarQRConfirmado(false) }}
              style={{
                background: '#e2e8f0',
                color: COLORS.textPrimary,
                border: 'none',
                borderRadius: '6px',
                padding: '0.6rem 1.2rem',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: 'pointer',
                width: '100%'
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
