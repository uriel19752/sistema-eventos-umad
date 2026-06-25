import { CheckCircle } from 'lucide-react'

const COLORS = {
  primary: '#1e3a8a',
  secondary: '#dc2626',
  background: '#f8fafc',
  surface: '#ffffff',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  white: '#ffffff',
  accent: '#f59e0b',
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

export default function SolicitudCompletaModal({ open, onClose, solicitud, materiales = [], userRol }: Props) {
  if (!open) return null

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3000, backdropFilter: 'blur(3px)' }}>
      <div style={{ background: COLORS.surface, padding: '2rem', borderRadius: '16px', maxWidth: '900px', width: '95%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, color: COLORS.primary, fontWeight: 700, fontSize: '1.3rem' }}>📄 Solicitud Completa</h3>
          <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', padding: '0.4rem 0.8rem', borderRadius: '6px', cursor: 'pointer', fontSize: '0.85rem' }}>Cerrar</button>
        </div>
        {solicitud ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', fontSize: '0.9rem' }}>
            <div style={{ background: COLORS.surface, border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 700, color: COLORS.primary, borderBottom: `2px solid ${COLORS.primary}`, paddingBottom: '0.5rem' }}>1. Área Solicitante</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: COLORS.textSecondary, marginBottom: '0.25rem' }}>Área / Departamento</label>
                  <input readOnly value={solicitud?.departamentoSolicitante ?? ''} style={{ width: '100%', padding: '0.5rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', color: COLORS.textPrimary, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: COLORS.textSecondary, marginBottom: '0.25rem' }}>Responsable del evento</label>
                  <input readOnly value={solicitud?.responsableNombre ?? ''} style={{ width: '100%', padding: '0.5rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', color: COLORS.textPrimary, boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: COLORS.textSecondary, marginBottom: '0.25rem' }}>WhatsApp / Correo de contacto</label>
                  <input readOnly value={solicitud?.contacto ?? ''} style={{ width: '100%', padding: '0.5rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', color: COLORS.textPrimary, boxSizing: 'border-box' }} />
                </div>
              </div>
            </div>

            <div style={{ background: COLORS.surface, border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 700, color: COLORS.primary, borderBottom: `2px solid ${COLORS.primary}`, paddingBottom: '0.5rem' }}>2. Información del Evento</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: COLORS.textSecondary, marginBottom: '0.25rem' }}>Nombre del evento</label>
                  <input readOnly value={solicitud?.nombreEvento ?? 'No especificado'} style={{ width: '100%', padding: '0.5rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', color: COLORS.textPrimary, boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: COLORS.textSecondary, marginBottom: '0.25rem' }}>Fecha del evento</label>
                    <input readOnly value={solicitud?.fechaEvento ? new Date(solicitud.fechaEvento).toISOString().split('T')[0] : ''} style={{ width: '100%', padding: '0.5rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', color: COLORS.textPrimary, boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: COLORS.textSecondary, marginBottom: '0.25rem' }}>Hora de inicio</label>
                    <input readOnly value={formatearHoraInput(solicitud?.horaInicio)} style={{ width: '100%', padding: '0.5rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', color: COLORS.textPrimary, boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: COLORS.textSecondary, marginBottom: '0.25rem' }}>Hora de término</label>
                    <input readOnly value={formatearHoraInput(solicitud?.horaFin)} style={{ width: '100%', padding: '0.5rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', color: COLORS.textPrimary, boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: COLORS.textSecondary, marginBottom: '0.25rem' }}>Hora de requerimiento del lugar (Montaje / Preparativos)</label>
                  <input readOnly value={formatearHoraInput(solicitud?.horaMontaje)} style={{ width: '100%', padding: '0.5rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', color: COLORS.textPrimary, boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: COLORS.textSecondary, marginBottom: '0.25rem' }}>Lugar</label>
                    <input readOnly value={solicitud?.lugarEspecifico ?? ''} style={{ width: '100%', padding: '0.5rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', color: COLORS.textPrimary, boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: COLORS.textSecondary, marginBottom: '0.25rem' }}>Ubicación específica</label>
                    <input readOnly value={solicitud?.ubicacion ?? (solicitud?.lugarEspecifico?.includes(' - ') ? solicitud.lugarEspecifico.split(' - ').slice(1).join(' - ') : '')} style={{ width: '100%', padding: '0.5rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', color: COLORS.textPrimary, boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: COLORS.textSecondary, marginBottom: '0.25rem' }}>Público objetivo</label>
                    <input readOnly value={solicitud?.publicoObjetivo ?? 'No especificado'} style={{ width: '100%', padding: '0.5rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', color: COLORS.textPrimary, boxSizing: 'border-box' }} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: COLORS.textSecondary, marginBottom: '0.25rem' }}>Autoridades que asisten</label>
                    <input readOnly value={solicitud?.autoridadesAsistentes ?? 'Ninguna registrada'} style={{ width: '100%', padding: '0.5rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', color: COLORS.textPrimary, boxSizing: 'border-box' }} />
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: COLORS.textSecondary, marginBottom: '0.25rem' }}>Descripción del evento</label>
                  <textarea readOnly value={solicitud?.descripcion ?? 'Sin descripción'} rows={3} style={{ width: '100%', padding: '0.5rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', color: COLORS.textPrimary, fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
            </div>

            <div style={{ background: COLORS.surface, border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 700, color: COLORS.primary, borderBottom: `2px solid ${COLORS.primary}`, paddingBottom: '0.5rem' }}>3. Objetivo y Logística</h2>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: COLORS.textSecondary, marginBottom: '0.25rem' }}>Objetivo de la cobertura</label>
                <textarea readOnly value={solicitud?.objetivoCobertura ?? 'Sin objetivo especificado'} rows={3} style={{ width: '100%', padding: '0.5rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', fontSize: '0.85rem', color: COLORS.textPrimary, fontFamily: 'inherit', resize: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>

            {userRol === 'ADMIN' && solicitud?.googleEventLink && (
              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <a
                  href={solicitud.googleEventLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.6rem 1.2rem',
                    background: COLORS.white,
                    color: COLORS.primary,
                    border: `2px solid ${COLORS.primary}`,
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    textDecoration: 'none',
                    cursor: 'pointer',
                  }}
                >
                  📅 Abrir en Google Calendar
                </a>
              </div>
            )}

            <div style={{ background: COLORS.surface, border: '1px solid #e2e8f0', borderRadius: '12px', padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <h2 style={{ margin: '0 0 1rem', fontSize: '1.1rem', fontWeight: 700, color: COLORS.primary, borderBottom: `2px solid ${COLORS.primary}`, paddingBottom: '0.5rem' }}>4. Material Requerido</h2>
              {materiales.length > 0 ? (
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
