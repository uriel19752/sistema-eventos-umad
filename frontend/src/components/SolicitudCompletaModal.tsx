import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { CheckCircle, Download, QrCode, Edit2, Save, X } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { COLORS } from '../theme/colors'

const MAPEO_JERARQUICO: Record<string, { id: string; nombre: string }[]> = {
  "1": [{ id: "1", nombre: "UMAD" }],
  "2": [
    { id: "2", nombre: "Prepa UMAD" },
    { id: "3", nombre: "IMM" },
  ],
  "3": [
    { id: "2", nombre: "Prepa UMAD" },
    { id: "3", nombre: "IMM" },
  ],
}

const NOMBRES_PLANTELES: Record<string, string> = {
  "1": "UMAD Campus Puebla",
  "2": "IMM Campus Centro",
  "3": "IMM Campus Zavaleta",
}

const NOMBRES_INSTITUCIONES: Record<string, string> = {
  "1": "UMAD",
  "2": "Prepa UMAD",
  "3": "IMM",
}

export interface SolicitudFields {
  id?: number
  folio?: string
  nombreEvento?: string
  fechaEvento?: string
  horaInicio?: string
  horaFin?: string
  horaMontaje?: string
  descripcion?: string | null
  objetivoCobertura?: string | null
  publicoObjetivo?: string | null
  autoridadesAsistentes?: string | null
  lugarEspecifico?: string | null
  ubicacion?: string | null
  responsableNombre?: string | null
  contacto?: string | null
  departamentoSolicitante?: string | null
  googleEventLink?: string | null
  estado?: string
  prioridad?: string
  plantel?: { nombre: string }
  institucion?: { nombre: string }
  plantelId?: number
  institucionId?: number
}

interface Material {
  id: number
  solicitudId: number
  tipoMaterial: string
  descripcionOtro: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  solicitud: SolicitudFields | null
  materiales?: Material[]
  userRol?: string
  onRefresh?: () => void
}

function formatearHoraInput(stringFecha: unknown) {
  if (!stringFecha) return ''
  const d = new Date(stringFecha as string)
  if (isNaN(d.getTime())) {
    if (typeof stringFecha === 'string') return stringFecha.slice(0, 5)
    return ''
  }
  return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
}

function formatearFechaInput(stringFecha: unknown) {
  if (!stringFecha) return ''
  const d = new Date(stringFecha as string)
  if (isNaN(d.getTime())) return ''
  return d.toISOString().split('T')[0]
}

export default function SolicitudCompletaModal({ open, onClose, solicitud, materiales = [], userRol, onRefresh }: Props) {
  const [editando, setEditando] = useState(false)

  const [nombreEvento, setNombreEvento] = useState('')
  const [area, setArea] = useState('')
  const [responsable, setResponsable] = useState('')
  const [contacto, setContacto] = useState('')
  const [plantelId, setPlantelId] = useState('')
  const [institucionId, setInstitucionId] = useState('')
  const [fechaEvento, setFechaEvento] = useState('')
  const [horaInicio, setHoraInicio] = useState('')
  const [horaFin, setHoraFin] = useState('')
  const [horaMontaje, setHoraMontaje] = useState('')
  const [lugar, setLugar] = useState('')
  const [ubicacion, setUbicacion] = useState('')
  const [publico, setPublico] = useState('')
  const [autoridades, setAutoridades] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [objetivo, setObjetivo] = useState('')

  const [materialesEdit, setMaterialesEdit] = useState({
    fotografias: false,
    notaWeb: false,
    banners: false,
    otro: '',
  })

  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const qrRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!solicitud) return
    setNombreEvento(solicitud.nombreEvento ?? '')
    setArea(solicitud.departamentoSolicitante ?? '')
    setResponsable(solicitud.responsableNombre ?? '')
    setContacto(solicitud.contacto ?? '')
    setPlantelId(solicitud.plantelId != null ? String(solicitud.plantelId) : '')
    setInstitucionId(solicitud.institucionId != null ? String(solicitud.institucionId) : '')
    setFechaEvento(formatearFechaInput(solicitud.fechaEvento))
    setHoraInicio(formatearHoraInput(solicitud.horaInicio))
    setHoraFin(formatearHoraInput(solicitud.horaFin))
    setHoraMontaje(formatearHoraInput(solicitud.horaMontaje))
    setLugar(solicitud.lugarEspecifico ?? '')
    setUbicacion(solicitud.ubicacion ?? '')
    setPublico(solicitud.publicoObjetivo ?? '')
    setAutoridades(solicitud.autoridadesAsistentes ?? '')
    setDescripcion(solicitud.descripcion ?? '')
    setObjetivo(solicitud.objetivoCobertura ?? '')
    setMaterialesEdit({
      fotografias: materiales.some((m) => m.tipoMaterial === 'Fotografia'),
      notaWeb: materiales.some((m) => m.tipoMaterial === 'Nota_Web'),
      banners: materiales.some((m) => m.tipoMaterial === 'Banner'),
      otro: materiales.find((m) => m.tipoMaterial === 'Otro')?.descripcionOtro ?? '',
    })
    setEditando(false)
    setError('')
  }, [solicitud])

  const institucionesDisponibles = MAPEO_JERARQUICO[plantelId] || []

  const manejarCambioPlantel = (pId: string) => {
    setPlantelId(pId)
    const opcionesValidas = MAPEO_JERARQUICO[pId] || []
    if (opcionesValidas.length > 0) {
      const instIdActualValida = opcionesValidas.some((i) => i.id === institucionId)
      if (!instIdActualValida) {
        setInstitucionId(opcionesValidas[0].id)
      }
    }
  }

  if (!open) return null

  const qrUrl = solicitud?.id ? `${window.location.origin}/evaluar/${solicitud.id}` : ''

  function descargarQR() {
    setTimeout(() => {
      const canvas = qrRef.current?.querySelector('canvas')
      if (!canvas) return
      const url = canvas.toDataURL('image/png')
      const a = document.createElement('a')
      a.href = url
      a.download = `QR-${solicitud?.folio || solicitud?.id}.png`
      a.click()
    }, 100)
  }

  async function handleGuardar() {
    if (!solicitud?.id) return
    setGuardando(true)
    setError('')
    try {
      const dto: Record<string, unknown> = {
        nombreEvento: nombreEvento || undefined,
        area: area || undefined,
        responsableNombre: responsable || undefined,
        contacto: contacto || undefined,
        plantelId: plantelId ? Number(plantelId) : undefined,
        institucionId: institucionId ? Number(institucionId) : undefined,
        fechaEvento: fechaEvento || undefined,
        horaInicio: horaInicio || undefined,
        horaFin: horaFin || undefined,
        horaMontaje: horaMontaje || undefined,
        lugar: lugar || undefined,
        ubicacion: ubicacion || undefined,
        publico: publico || undefined,
        autoridades: autoridades || undefined,
        descripcion: descripcion || undefined,
        objetivo: objetivo || undefined,
        materiales: {
          fotografias: materialesEdit.fotografias,
          notaWeb: materialesEdit.notaWeb,
          banners: materialesEdit.banners,
          otro: materialesEdit.otro || undefined,
        },
      }
      await axios.put(`/api/solicitudes/${solicitud.id}`, dto)
      setEditando(false)
      onRefresh?.()
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al guardar los cambios')
    } finally {
      setGuardando(false)
    }
  }

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.72rem',
    fontWeight: 600,
    color: COLORS.textSecondary,
    marginBottom: '0.3rem',
    letterSpacing: '0.02em',
    textTransform: 'uppercase',
  }

  const inputStyle: React.CSSProperties = editando
    ? {
        width: '100%',
        padding: '0.55rem 0.65rem',
        background: '#ffffff',
        border: '2px solid #2563EB',
        borderRadius: '8px',
        fontSize: '0.85rem',
        color: '#0F172A',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        outline: 'none',
        boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.1)',
      }
    : {
        width: '100%',
        padding: '0.55rem 0.65rem',
        background: '#f1f5f9',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '0.85rem',
        color: '#334155',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
      }

  const selectStyle: React.CSSProperties = editando
    ? {
        width: '100%',
        padding: '0.55rem 0.65rem',
        background: '#ffffff',
        border: '2px solid #2563EB',
        borderRadius: '8px',
        fontSize: '0.85rem',
        color: '#0F172A',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        outline: 'none',
        boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.1)',
        cursor: 'pointer',
      }
    : {
        width: '100%',
        padding: '0.55rem 0.65rem',
        background: '#f1f5f9',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        fontSize: '0.85rem',
        color: '#334155',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
      }

  const sectionCardStyle: React.CSSProperties = {
    background: COLORS.surface,
    border: '1px solid rgba(226, 232, 240, 0.8)',
    borderRadius: '16px',
    padding: '1.25rem',
    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
  }

  const sectionHeaderStyle: React.CSSProperties = {
    margin: '0 0 1rem',
    fontSize: '1.1rem',
    fontWeight: 700,
    color: '#0F172A',
    borderBottom: '2px solid #1E3A8A',
    paddingBottom: '0.5rem',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, backdropFilter: 'blur(3px)' }}>
      <div style={{ background: COLORS.surface, padding: '2rem', borderRadius: '20px', maxWidth: '920px', width: '95%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, color: COLORS.primary, fontWeight: 700, fontSize: '1.3rem' }}>Solicitud Completa</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {!editando ? (
              <button
                onClick={() => setEditando(true)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.9rem', background: '#2563EB', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
              >
                <Edit2 size={14} />
                Editar Datos
              </button>
            ) : (
              <>
                <button
                  onClick={handleGuardar}
                  disabled={guardando}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.9rem', background: guardando ? '#94a3b8' : '#16a34a', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.8rem', cursor: guardando ? 'not-allowed' : 'pointer' }}
                >
                  <Save size={14} />
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
                <button
                  onClick={() => { setEditando(false); setError('') }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.9rem', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer' }}
                >
                  <X size={14} />
                  Cancelar
                </button>
              </>
            )}
            <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#475569' }}>Cerrar</button>
          </div>
        </div>
        {error && (
          <div style={{ padding: '0.6rem 1rem', marginBottom: '1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', color: '#dc2626', fontSize: '0.85rem', fontWeight: 500 }}>{error}</div>
        )}
        {solicitud ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', fontSize: '0.9rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', alignItems: 'center', gap: '1rem' }}>
              <div style={{ justifySelf: 'start' }}>
                {userRol === 'ADMIN' && solicitud?.googleEventLink && (
                  <a href={solicitud.googleEventLink} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: COLORS.white, color: COLORS.primary, border: `2px solid ${COLORS.primary}`, borderRadius: 8, fontWeight: 600, fontSize: '0.85rem', textDecoration: 'none', cursor: 'pointer' }}>
                    Google Calendar
                  </a>
                )}
              </div>
              <div style={{ justifySelf: 'end' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', background: COLORS.surface, border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                  <QrCode size={18} color={COLORS.primary} />
                  <div ref={qrRef}>
                    {qrUrl && <QRCodeCanvas value={qrUrl} size={75} />}
                  </div>
                  <button onClick={descargarQR} title="Descargar código QR" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.75rem', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    <Download size={14} />
                    QR
                  </button>
                </div>
              </div>
            </div>

            <div style={{ ...sectionCardStyle }}>
              <h2 style={{ ...sectionHeaderStyle }}>1. Datos del Solicitante</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Plantel de Adscripción</label>
                  {editando ? (
                    <select value={plantelId} onChange={(e) => manejarCambioPlantel(e.target.value)} style={selectStyle}>
                      <option value="1">UMAD Campus Puebla</option>
                      <option value="2">IMM Campus Centro</option>
                      <option value="3">IMM Campus Zavaleta</option>
                    </select>
                  ) : (
                    <input readOnly value={NOMBRES_PLANTELES[plantelId] ?? 'No asignado'} style={inputStyle} />
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Institución Organizadora</label>
                  {editando ? (
                    <select value={institucionId} onChange={(e) => setInstitucionId(e.target.value)} style={selectStyle}>
                      {institucionesDisponibles.map((inst) => (
                        <option key={inst.id} value={inst.id}>{inst.nombre}</option>
                      ))}
                    </select>
                  ) : (
                    <input readOnly value={NOMBRES_INSTITUCIONES[institucionId] ?? 'No asignada'} style={inputStyle} />
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Área / Departamento</label>
                  <input readOnly={!editando} value={area} onChange={(e) => setArea(e.target.value)} style={inputStyle} placeholder={editando ? 'Ej. Difusión Cultural' : ''} />
                </div>
                <div>
                  <label style={labelStyle}>Responsable del Evento</label>
                  <input readOnly={!editando} value={responsable} onChange={(e) => setResponsable(e.target.value)} style={inputStyle} placeholder={editando ? 'Nombre del responsable' : ''} />
                </div>
                <div>
                  <label style={labelStyle}>WhatsApp / Correo de Contacto</label>
                  <input readOnly={!editando} value={contacto} onChange={(e) => setContacto(e.target.value)} style={inputStyle} placeholder={editando ? 'Ej. 2221234567' : ''} />
                </div>
              </div>
            </div>

            <div style={{ ...sectionCardStyle }}>
              <h2 style={{ ...sectionHeaderStyle }}>2. Información del Evento</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={labelStyle}>Nombre del evento</label>
                  <input readOnly={!editando} value={nombreEvento} onChange={(e) => setNombreEvento(e.target.value)} style={inputStyle} placeholder={editando ? 'Ej. Feria de Ciencias' : ''} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={labelStyle}>Fecha del evento</label>
                    <input type="date" readOnly={!editando} value={fechaEvento} onChange={(e) => setFechaEvento(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Hora de inicio</label>
                    <input type="time" readOnly={!editando} value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Hora de término</label>
                    <input type="time" readOnly={!editando} value={horaFin} onChange={(e) => setHoraFin(e.target.value)} style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Hora de requerimiento del lugar (Montaje / Preparativos)</label>
                  <input type="time" readOnly={!editando} value={horaMontaje} onChange={(e) => setHoraMontaje(e.target.value)} style={inputStyle} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={labelStyle}>Plantel (Lugar Físico)</label>
                    {editando ? (
                      <select value={lugar} onChange={(e) => setLugar(e.target.value)} style={selectStyle}>
                        <option value="UMAD">UMAD</option>
                        <option value="IMM Centro">IMM Centro</option>
                        <option value="IMM Zavaleta">IMM Zavaleta</option>
                        <option value="Lugar Externo">Lugar Externo</option>
                      </select>
                    ) : (
                      <input readOnly value={lugar || (solicitud.lugarEspecifico ?? '')} style={inputStyle} />
                    )}
                  </div>
                  <div>
                    <label style={labelStyle}>Ubicación específica</label>
                    <input readOnly={!editando} value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} style={inputStyle} placeholder={editando ? 'Ej. Edificio A, 2do piso' : ''} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={labelStyle}>Público objetivo</label>
                    <input readOnly={!editando} value={publico} onChange={(e) => setPublico(e.target.value)} style={inputStyle} placeholder={editando ? 'Ej. Alumnos, docentes' : ''} />
                  </div>
                  <div>
                    <label style={labelStyle}>Autoridades que asisten</label>
                    <input readOnly={!editando} value={autoridades} onChange={(e) => setAutoridades(e.target.value)} style={inputStyle} placeholder={editando ? 'Ej. Rector, Directores' : ''} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>Descripción del evento</label>
                  <textarea readOnly={!editando} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={3} style={{ ...inputStyle, resize: editando ? 'vertical' : 'none' as const }} placeholder={editando ? 'Describe el evento...' : ''} />
                </div>
              </div>
            </div>

            <div style={{ ...sectionCardStyle }}>
              <h2 style={{ ...sectionHeaderStyle }}>3. Objetivo y Logística</h2>
              <div>
                <label style={labelStyle}>Objetivo de la cobertura</label>
                <textarea readOnly={!editando} value={objetivo} onChange={(e) => setObjetivo(e.target.value)} rows={3} style={{ ...inputStyle, resize: editando ? 'vertical' : 'none' as const }} placeholder={editando ? 'Describe el objetivo...' : ''} />
              </div>
            </div>

            <div style={{ ...sectionCardStyle }}>
              <h2 style={{ ...sectionHeaderStyle }}>4. Material Requerido</h2>
              {editando ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: '#334155' }}>
                    <input type="checkbox" checked={materialesEdit.fotografias} onChange={(e) => setMaterialesEdit((prev) => ({ ...prev, fotografias: e.target.checked }))} style={{ width: '1rem', height: '1rem', accentColor: '#2563EB' }} />
                    Fotografías
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: '#334155' }}>
                    <input type="checkbox" checked={materialesEdit.notaWeb} onChange={(e) => setMaterialesEdit((prev) => ({ ...prev, notaWeb: e.target.checked }))} style={{ width: '1rem', height: '1rem', accentColor: '#2563EB' }} />
                    Nota Web
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: '#334155' }}>
                    <input type="checkbox" checked={materialesEdit.banners} onChange={(e) => setMaterialesEdit((prev) => ({ ...prev, banners: e.target.checked }))} style={{ width: '1rem', height: '1rem', accentColor: '#2563EB' }} />
                    Banners
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.85rem', color: '#334155' }}>
                      <input type="checkbox" checked={!!materialesEdit.otro} onChange={(e) => setMaterialesEdit((prev) => ({ ...prev, otro: e.target.checked ? ' ' : '' }))} style={{ width: '1rem', height: '1rem', accentColor: '#2563EB' }} />
                      Otro
                    </label>
                    {!!materialesEdit.otro && (
                      <input type="text" value={materialesEdit.otro === ' ' ? '' : materialesEdit.otro} onChange={(e) => setMaterialesEdit((prev) => ({ ...prev, otro: e.target.value }))} placeholder="Especifica el material..." style={{ ...inputStyle }} />
                    )}
                  </div>
                </div>
              ) : materiales.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem' }}>
                  {materiales.map((m) => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.75rem', background: '#f1f5f9', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <CheckCircle size={16} color={COLORS.primary} />
                      <span style={{ fontSize: '0.85rem', color: COLORS.textPrimary }}>{m.tipoMaterial}{m.descripcionOtro ? ` (${m.descripcionOtro})` : ''}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, color: COLORS.textSecondary, fontSize: '0.85rem' }}>No se especificaron materiales.</p>
              )}
            </div>
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: COLORS.textSecondary, fontSize: '0.9rem' }}>Cargando información de la solicitud...</p>
        )}
      </div>
    </div>
  )
}
