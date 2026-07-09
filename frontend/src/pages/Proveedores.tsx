import { useState, useCallback, useEffect } from 'react'
import axios from 'axios'
import { Plus, Pencil, Trash2, X, AlertCircle, CheckCircle, Mail, Phone, Building2, Wrench } from 'lucide-react'
import { COLORS } from '../theme/colors'

interface Proveedor {
  id: number
  nombre: string
  especialidad: string | null
  email: string | null
  telefono: string | null
  activo: boolean
}

type FormErrors = Partial<Record<'nombre' | 'especialidad' | 'email', string>>

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.65rem 0.9rem',
  background: COLORS.white,
  border: `1.5px solid ${COLORS.border}`,
  borderRadius: '8px',
  fontSize: '0.875rem',
  fontWeight: 500,
  color: COLORS.textPrimary,
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  boxSizing: 'border-box',
  fontFamily: 'Inter, sans-serif',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '0.8rem',
  fontWeight: 600,
  color: COLORS.textPrimary,
  marginBottom: '0.35rem',
}

export default function Proveedores() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editando, setEditando] = useState<Proveedor | null>(null)
  const [formData, setFormData] = useState({ nombre: '', especialidad: '', email: '', telefono: '' })
  const [errores, setErrores] = useState<FormErrors>({})
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null)
  const [guardando, setGuardando] = useState(false)

  const cargarProveedores = useCallback(async () => {
    try {
      setLoading(true)
      const res = await axios.get('/api/proveedores')
      setProveedores(res.data)
    } catch {
      console.error('Error al cargar proveedores')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarProveedores();
  }, []);

  function abrirModalCrear() {
    setEditando(null)
    setFormData({ nombre: '', especialidad: '', email: '', telefono: '' })
    setErrores({})
    setModalOpen(true)
  }

  function abrirModalEditar(p: Proveedor) {
    setEditando(p)
    setFormData({
      nombre: p.nombre,
      especialidad: p.especialidad ?? '',
      email: p.email ?? '',
      telefono: p.telefono ?? '',
    })
    setErrores({})
    setModalOpen(true)
  }

  function cerrarModal() {
    setModalOpen(false)
    setEditando(null)
    setErrores({})
  }

  function validar(): boolean {
    const e: FormErrors = {}
    if (!formData.nombre.trim()) e.nombre = 'El nombre es obligatorio'
    if (!formData.especialidad.trim()) e.especialidad = 'La especialidad es obligatoria'
    if (!formData.email.trim()) {
      e.email = 'El correo electrónico es obligatorio'
    } else if (!EMAIL_REGEX.test(formData.email.trim())) {
      e.email = 'Ingresa un correo electrónico válido'
    }
    setErrores(e)
    return Object.keys(e).length === 0
  }

  async function handleGuardar() {
    if (!validar()) return
    setGuardando(true)
    try {
      const payload = {
        nombre: formData.nombre.trim(),
        especialidad: formData.especialidad.trim() || undefined,
        email: formData.email.trim() || undefined,
        telefono: formData.telefono.trim() || undefined,
      }
      if (editando) {
        await axios.put(`/api/proveedores/${editando.id}`, payload)
      } else {
        await axios.post('/api/proveedores', payload)
      }
      cerrarModal()
      await cargarProveedores()
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error ?? 'Error al guardar'
        : 'Error al guardar'
      alert(msg)
    } finally {
      setGuardando(false)
    }
  }

  async function handleDesactivar(id: number) {
    try {
      await axios.delete(`/api/proveedores/${id}`)
      setDeleteConfirmId(null)
      await cargarProveedores()
    } catch (err) {
      const msg = axios.isAxiosError(err)
        ? err.response?.data?.error ?? 'Error al desactivar'
        : 'Error al desactivar'
      alert(msg)
    }
  }

  const thStyle: React.CSSProperties = {
    padding: '0.75rem 1rem',
    textAlign: 'left',
    fontSize: '0.75rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    color: COLORS.white,
    background: COLORS.secondary,
    whiteSpace: 'nowrap',
  }

  const tdStyle: React.CSSProperties = {
    padding: '0.75rem 1rem',
    fontSize: '0.875rem',
    color: COLORS.textPrimary,
    borderBottom: `1px solid ${COLORS.border}`,
  }

  return (
    <div style={{ animation: 'fadeSlideIn 0.3s ease' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem',
      }}>
        <div>
          <p style={{ fontSize: '0.65rem', fontWeight: 800, color: COLORS.secondary, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.3rem' }}>
            Catálogo
          </p>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: COLORS.textPrimary }}>
            Gestión de Proveedores Externos
          </h2>
        </div>
        <button
          className="tt-btn tt-btn-primary"
          onClick={abrirModalCrear}
          style={{ gap: '0.5rem', padding: '0.65rem 1.35rem', fontSize: '0.9rem' }}
        >
          <Plus size={18} />
          Agregar Proveedor
        </button>
      </div>

      <div className="tt-card">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '700px' }}>
            <thead>
              <tr>
                <th style={thStyle}>Nombre</th>
                <th style={thStyle}>Servicio / Especialidad</th>
                <th style={thStyle}>Correo Electrónico</th>
                <th style={thStyle}>Teléfono</th>
                <th style={{ ...thStyle, textAlign: 'center', width: '120px' }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ ...tdStyle, textAlign: 'center', padding: '2rem' }}>
                    Cargando proveedores...
                  </td>
                </tr>
              ) : proveedores.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ ...tdStyle, textAlign: 'center', padding: '2rem', color: COLORS.textSecondary }}>
                    No hay proveedores registrados
                  </td>
                </tr>
              ) : (
                proveedores.map((p, i) => (
                  <tr
                    key={p.id}
                    style={{
                      background: i % 2 === 0 ? COLORS.white : '#F8FAFC',
                      transition: 'background 0.15s',
                      opacity: p.activo ? 1 : 0.55,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#EEF2FF' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = i % 2 === 0 ? COLORS.white : '#F8FAFC' }}
                  >
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Building2 size={16} color={COLORS.textSecondary} />
                        <span style={{ fontWeight: 600 }}>{p.nombre}</span>
                        {!p.activo && (
                          <span className="tt-badge" style={{ background: '#FEE2E2', color: COLORS.danger, fontSize: '0.6rem' }}>
                            Inactivo
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Wrench size={14} color={COLORS.textSecondary} />
                        {p.especialidad ?? '—'}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Mail size={14} color={COLORS.textSecondary} />
                        {p.email ?? '—'}
                      </div>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Phone size={14} color={COLORS.textSecondary} />
                        {p.telefono ?? '—'}
                      </div>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center' }}>
                        <button
                          className="tt-btn tt-btn-ghost"
                          style={{ padding: '0.4rem 0.65rem', fontSize: '0.75rem' }}
                          onClick={() => abrirModalEditar(p)}
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="tt-btn tt-btn-ghost"
                          style={{ padding: '0.4rem 0.65rem', fontSize: '0.75rem', borderColor: '#FECACA', color: COLORS.danger }}
                          onClick={() => setDeleteConfirmId(p.id)}
                          title="Desactivar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear / Editar */}
      {modalOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(15,23,42,0.45)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) cerrarModal() }}
        >
          <div
            style={{
              background: COLORS.white,
              borderRadius: '16px',
              maxWidth: '500px',
              width: '92%',
              boxShadow: '0 24px 48px -8px rgba(15,23,42,0.18)',
              animation: 'fadeSlideIn 0.25s ease',
            }}
          >
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '1.25rem 1.5rem', borderBottom: `1px solid ${COLORS.border}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: 'linear-gradient(135deg, #1E3A8A, #2563EB)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {editando ? <Pencil size={18} color="white" /> : <Plus size={18} color="white" />}
                </div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: COLORS.textPrimary }}>
                  {editando ? 'Editar Proveedor' : 'Nuevo Proveedor'}
                </h3>
              </div>
              <button
                onClick={cerrarModal}
                style={{
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  color: COLORS.textSecondary, padding: '4px', borderRadius: '6px',
                  display: 'flex', transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.color = COLORS.textPrimary }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = COLORS.textSecondary }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={labelStyle}>
                  Nombre <span style={{ color: COLORS.danger }}>*</span>
                </label>
                <input
                  className="tt-input"
                  value={formData.nombre}
                  onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                  placeholder="Nombre del proveedor"
                  style={errores.nombre ? { ...inputStyle, borderColor: COLORS.danger } : inputStyle}
                />
                {errores.nombre && (
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: COLORS.danger, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <AlertCircle size={12} /> {errores.nombre}
                  </p>
                )}
              </div>

              <div>
                <label style={labelStyle}>
                  Servicio / Especialidad <span style={{ color: COLORS.danger }}>*</span>
                </label>
                <input
                  className="tt-input"
                  value={formData.especialidad}
                  onChange={(e) => setFormData({ ...formData, especialidad: e.target.value })}
                  placeholder="Ej. Fotografía, Sonido, Diseño"
                  style={errores.especialidad ? { ...inputStyle, borderColor: COLORS.danger } : inputStyle}
                />
                {errores.especialidad && (
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: COLORS.danger, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <AlertCircle size={12} /> {errores.especialidad}
                  </p>
                )}
              </div>

              <div>
                <label style={labelStyle}>
                  Correo Electrónico <span style={{ color: COLORS.danger }}>*</span>
                </label>
                <input
                  className="tt-input"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="proveedor@ejemplo.com"
                  style={errores.email ? { ...inputStyle, borderColor: COLORS.danger } : inputStyle}
                />
                {errores.email && (
                  <p style={{ margin: '0.25rem 0 0', fontSize: '0.75rem', color: COLORS.danger, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <AlertCircle size={12} /> {errores.email}
                  </p>
                )}
              </div>

              <div>
                <label style={labelStyle}>Teléfono</label>
                <input
                  className="tt-input"
                  value={formData.telefono}
                  onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                  placeholder="Ej. 222 123 4567"
                />
              </div>
            </div>

            <div style={{
              display: 'flex', justifyContent: 'flex-end', gap: '0.75rem',
              padding: '1rem 1.5rem', borderTop: `1px solid ${COLORS.border}`,
              background: '#F8FAFC', borderRadius: '0 0 16px 16px',
            }}>
              <button
                className="tt-btn tt-btn-ghost"
                onClick={cerrarModal}
                disabled={guardando}
              >
                Cancelar
              </button>
              <button
                className="tt-btn tt-btn-primary"
                onClick={handleGuardar}
                disabled={guardando}
                style={{ gap: '0.4rem' }}
              >
                {guardando ? 'Guardando...' : (
                  <>{editando ? <CheckCircle size={16} /> : <Plus size={16} />} {editando ? 'Actualizar' : 'Guardar'}</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmación Eliminar */}
      {deleteConfirmId !== null && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 110,
            background: 'rgba(15,23,42,0.45)',
            backdropFilter: 'blur(6px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setDeleteConfirmId(null) }}
        >
          <div
            style={{
              background: COLORS.white,
              borderRadius: '16px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 24px 48px -8px rgba(15,23,42,0.18)',
              animation: 'fadeSlideIn 0.25s ease',
            }}
          >
            <div style={{ padding: '1.5rem', textAlign: 'center' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                background: '#FEE2E2', display: 'flex', alignItems: 'center',
                justifyContent: 'center', margin: '0 auto 1rem',
              }}>
                <AlertCircle size={24} color={COLORS.danger} />
              </div>
              <h3 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', fontWeight: 700, color: COLORS.textPrimary }}>
                Desactivar Proveedor
              </h3>
              <p style={{ fontSize: '0.875rem', color: COLORS.textSecondary, lineHeight: 1.5 }}>
                ¿Estás seguro de desactivar este proveedor? Podrás reactivarlo después si es necesario.
              </p>
            </div>
            <div style={{
              display: 'flex', justifyContent: 'flex-end', gap: '0.75rem',
              padding: '1rem 1.5rem', borderTop: `1px solid ${COLORS.border}`,
              background: '#F8FAFC', borderRadius: '0 0 16px 16px',
            }}>
              <button
                className="tt-btn tt-btn-ghost"
                onClick={() => setDeleteConfirmId(null)}
              >
                Cancelar
              </button>
              <button
                className="tt-btn tt-btn-danger"
                onClick={() => handleDesactivar(deleteConfirmId)}
                style={{ gap: '0.4rem' }}
              >
                <Trash2 size={16} />
                Desactivar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
