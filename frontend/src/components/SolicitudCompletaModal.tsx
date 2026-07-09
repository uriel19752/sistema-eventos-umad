import { useEffect, useRef, useState, startTransition } from 'react'
import axios from 'axios'
import { CheckCircle, Download, QrCode, Edit2, Save, X, Loader2, UserCheck } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { COLORS } from '../theme/colors'
import { PdfReport, type ColumnDef } from '../export'

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

export interface DatosEspecificos {
  apoyoEstacionamiento?: string
  necesitaMantenimiento?: string
  mantenimientoItems?: string[]
  cantMesas?: number
  cantSillas?: number
  cantPanos?: number
  gestionExternaItems?: string[]
  necesitaAudiovisuales?: string
  audiovisualItems?: string[]
  audiovisualesOtrosTexto?: string
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
  datosEspecificos?: DatosEspecificos | null
  croquisUrl?: string | null
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
  const [paso, setPaso] = useState(1)
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

  const [editApoyoEstacionamiento, setEditApoyoEstacionamiento] = useState('')
  const [editNecesitaMantenimiento, setEditNecesitaMantenimiento] = useState('')
  const [editMantenimientoItems, setEditMantenimientoItems] = useState<string[]>([])
  const [editCantMesas, setEditCantMesas] = useState(0)
  const [editCantSillas, setEditCantSillas] = useState(0)
  const [editCantPanos, setEditCantPanos] = useState(0)
  const [editGestionExternaItems, setEditGestionExternaItems] = useState<string[]>([])
  const [editNecesitaAudiovisuales, setEditNecesitaAudiovisuales] = useState('')
  const [editAudiovisualItems, setEditAudiovisualItems] = useState<string[]>([])
  const [editAudiovisualesOtrosTexto, setEditAudiovisualesOtrosTexto] = useState('')

  const [guardando, setGuardando] = useState(false)
  const [exportandoPDF, setExportandoPDF] = useState(false)
  const [error, setError] = useState('')

  const [proveedores, setProveedores] = useState<{ id: number; nombre: string; especialidad: string | null }[]>([])
  const [selectedProveedorIds, setSelectedProveedorIds] = useState<number[]>([])
  const [savingAsignacion, setSavingAsignacion] = useState(false)
  const [successAsignacion, setSuccessAsignacion] = useState('')

  const qrRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!solicitud) return
    startTransition(() => {
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
      const de = solicitud.datosEspecificos as DatosEspecificos | null | undefined
      setEditApoyoEstacionamiento(de?.apoyoEstacionamiento ?? '')
      setEditNecesitaMantenimiento(de?.necesitaMantenimiento ?? '')
      setEditMantenimientoItems(de?.mantenimientoItems ?? [])
      setEditCantMesas(de?.cantMesas ?? 0)
      setEditCantSillas(de?.cantSillas ?? 0)
      setEditCantPanos(de?.cantPanos ?? 0)
      setEditGestionExternaItems(de?.gestionExternaItems ?? [])
      setEditNecesitaAudiovisuales(de?.necesitaAudiovisuales ?? '')
      setEditAudiovisualItems(de?.audiovisualItems ?? [])
      setEditAudiovisualesOtrosTexto(de?.audiovisualesOtrosTexto ?? '')
      setEditando(false)
      setError('')
    })
  }, [solicitud, materiales])

  useEffect(() => {
    if (!open || !solicitud?.id) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSuccessAsignacion('')
    axios.get('/api/proveedores').then((res) => setProveedores(res.data)).catch(() => {})
    axios.get(`/api/solicitudes/${solicitud.id}`).then((res) => {
      const data = res.data
      const asignaciones: { proveedorId: number }[] = data.asignacionProveedores ?? []
      setSelectedProveedorIds(asignaciones.map((a) => a.proveedorId))
    }).catch(() => {})
  }, [open, solicitud?.id])

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

  async function generarPDFSolicitud() {
    if (!solicitud) return
    setExportandoPDF(true)

    const qrDataUrl = (() => {
      try {
        const canvas = qrRef.current?.querySelector('canvas')
        return canvas ? canvas.toDataURL('image/png') : null
      } catch { return null }
    })()

    try {
      const folio = solicitud.folio || String(solicitud.id) || 'documento'
      const report = new PdfReport({ title: `Solicitud_${folio}`, headerFooter: true })
      const doc = report.getDoc()
      const pw = doc.internal.pageSize.getWidth()
      const ph = doc.internal.pageSize.getHeight()
      const ml = 15
      const mr = 15
      let y = 20

      // ═══ CUSTOM HEADER ═══
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(16)
      doc.setTextColor(30, 58, 138)
      doc.text('TIGRETRACK', ml, y)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(100, 116, 139)
      doc.text('REPORTE DE COBERTURA LOGÍSTICA', ml, y + 4.5)

      const statusColors: Record<string, [number, number, number]> = {
        Pendiente: [245, 158, 11],
        Aprobado: [30, 58, 138],
        Completada: [22, 163, 74],
        Cancelada: [220, 38, 38],
      }
      const sColor = statusColors[solicitud.estado ?? ''] ?? [100, 116, 139]
      doc.setFillColor(sColor[0], sColor[1], sColor[2])
      doc.roundedRect(ml, y + 6.5, 32, 5, 2, 2, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(5.5)
      doc.setTextColor(255, 255, 255)
      doc.text((solicitud.estado ?? 'SIN ESTADO').toUpperCase(), ml + 16, y + 10, { align: 'center' })

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(225, 29, 72)

      const qrSize = 20
      const qrRightX = pw - mr - 4
      const qrX = qrRightX - qrSize

      if (qrDataUrl) {
        doc.addImage(qrDataUrl, 'PNG', qrX, y - 3, qrSize, qrSize)
      }

      const folioGap = 5
      const folioMaxX = qrX - folioGap
      const folioWidth = doc.getTextWidth(folio)
      const folioX = Math.min(ml + 80, folioMaxX - folioWidth)
      doc.text(folio, folioX, y)

      y += 16
      doc.setDrawColor(225, 29, 72)
      doc.setLineWidth(0.6)
      doc.line(ml, y, pw - mr, y)
      y += 8
      report.setCurrentY(y)

      // ═══ RESUMEN EJECUTIVO ═══
      report.addSectionTitle('Resumen Ejecutivo')

      const eventName = nombreEvento || solicitud.nombreEvento || '—'
      const eventDateDisplay = solicitud.fechaEvento
        ? new Date(solicitud.fechaEvento).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })
        : '—'
      const mountTime = horaMontaje || formatearHoraInput(solicitud.horaMontaje) || '—'
      const startTime = horaInicio || formatearHoraInput(solicitud.horaInicio) || '—'
      const endTime = horaFin || formatearHoraInput(solicitud.horaFin) || '—'
      const eventPlace = lugar || solicitud.lugarEspecifico || '—'
      const eventLocation = ubicacion || solicitud.ubicacion || '—'
      const eventResponsable = responsable || solicitud.responsableNombre || '—'
      const tipoTiempo = startTime !== '—' && endTime !== '—' ? `${startTime} — ${endTime}` : startTime
      const materialesStr = materiales.length > 0 ? materiales.map(m => m.tipoMaterial).join(', ') : 'No especificados'

      report.addKpiCards([
        { label: 'Evento', value: eventName, color: '#1E3A8A' },
        { label: 'Fecha', value: eventDateDisplay, color: '#1E3A8A' },
        { label: 'Horario', value: tipoTiempo, color: '#1E3A8A' },
        { label: 'Lugar', value: eventPlace + (eventLocation !== '—' ? ` — ${eventLocation}` : ''), color: '#1E3A8A' },
        { label: 'Responsable', value: eventResponsable, color: '#1E3A8A' },
        { label: 'Servicios', value: materialesStr, color: '#1E3A8A' },
      ])

      // ═══ CRONOLOGÍA ═══
      report.addSectionTitle('Cronología del Evento')
      report.addKpiCards([
        { label: 'Montaje', value: mountTime, color: '#F59E0B' },
        { label: 'Inicio', value: startTime, color: '#16A34A' },
        { label: 'Finalización', value: endTime, color: '#DC2626' },
      ])

      // ═══ INFORMACIÓN DETALLADA ═══
      report.addSectionTitle('Información del Solicitante y Ubicación')

      const instName = NOMBRES_INSTITUCIONES[institucionId] || solicitud.institucion?.nombre || '—'
      const plantelName = NOMBRES_PLANTELES[plantelId] || solicitud.plantel?.nombre || '—'
      const eventArea = area || solicitud.departamentoSolicitante || '—'
      const eventContact = contacto || solicitud.contacto || '—'
      const eventPublic = publico || solicitud.publicoObjetivo || '—'
      const eventAutorities = autoridades || solicitud.autoridadesAsistentes || '—'

      const detailItems = [
        { label: 'Institución', value: instName },
        { label: 'Plantel', value: plantelName },
        { label: 'Área / Departamento', value: eventArea },
        { label: 'Responsable', value: eventResponsable },
        { label: 'Contacto', value: eventContact },
        { label: 'Ubicación Específica', value: eventLocation },
        { label: 'Público Objetivo', value: eventPublic },
        { label: 'Autoridades Asistentes', value: eventAutorities },
      ]
      for (const item of detailItems) {
        report.addBodyText(`${item.label}: ${item.value}`, { fontSize: 9, color: '#1E293B' })
      }

      // ═══ ENTREGABLES ═══
      report.addSectionTitle('Entregables Comprometidos')
      if (materiales.length > 0) {
        const matColumns: ColumnDef[] = [
          { header: 'Tipo de Material', dataKey: 'tipo', width: 60 },
          { header: 'Descripción', dataKey: 'desc', width: 80 },
        ]
        const matData = materiales.map(m => ({
          tipo: m.tipoMaterial,
          desc: m.descripcionOtro ?? '—',
        }))
        report.addTable(matColumns, matData)
      } else {
        report.addBodyText('No se especificaron materiales.', { fontSize: 9, color: '#64748B' })
      }

      // ═══ REQUERIMIENTOS LOGÍSTICOS ═══
      const de = solicitud.datosEspecificos as DatosEspecificos | null | undefined
      if (de) {
        const logItems: string[] = []
        if (de.apoyoEstacionamiento === 'si') logItems.push('Estacionamiento / Acceso')
        if (de.necesitaMantenimiento === 'si') {
          const equipos = (de.mantenimientoItems ?? []).map((i: string) => {
            const cant = i === 'Mesas' ? (de.cantMesas ?? 0) : i === 'Sillas' ? (de.cantSillas ?? 0) : i === 'Paños' ? (de.cantPanos ?? 0) : 0
            return `${i}${cant > 0 ? ` (${cant})` : ''}`
          })
          logItems.push(`Mantenimiento: ${equipos.join(', ')}`)
          if (de.gestionExternaItems?.length) logItems.push(`Gestión externa: ${de.gestionExternaItems.join(', ')}`)
        }
        if (de.necesitaAudiovisuales === 'si') {
          let audiovisualStr = (de.audiovisualItems ?? []).join(', ')
          if (de.audiovisualItems?.includes('Otros') && de.audiovisualesOtrosTexto) {
            audiovisualStr = audiovisualStr.replace('Otros', `Otros (${de.audiovisualesOtrosTexto})`)
          }
          logItems.push(`Audiovisual: ${audiovisualStr}`)
        }
        if (logItems.length > 0) {
          report.addSectionTitle('Requerimientos Logísticos')
          for (const item of logItems) {
            report.addBodyText(`• ${item}`, { fontSize: 9, color: '#1E293B' })
          }
          if (solicitud.croquisUrl) {
            report.addBodyText(`Croquis disponible: ${solicitud.croquisUrl}`, { fontSize: 8, color: '#2563EB' })
          }
        }
      }

      // ═══ OBJETIVO ═══
      const eventObjetivo = objetivo || solicitud.objetivoCobertura || 'No especificado'
      report.addSectionTitle('Objetivo de Cobertura')
      report.addBodyText(eventObjetivo, { fontSize: 9, color: '#334155' })

      // ═══ DESCRIPCIÓN ═══
      const eventDesc = descripcion || solicitud.descripcion || 'No especificada'
      report.addSectionTitle('Descripción del Evento')
      report.addBodyText(eventDesc, { fontSize: 9, color: '#334155' })

      // ═══ FIRMAS ═══
      const sigThreshold = ph - 20 - 15
      if (report.getCurrentY() + 30 > sigThreshold) {
        report.addPage()
      }
      const sigYPos = Math.max(report.getCurrentY() + 10, sigThreshold)
      doc.setDrawColor(203, 213, 225)
      doc.setLineWidth(0.5)
      doc.line(ml, sigYPos, ml + 75, sigYPos)
      doc.line(pw - mr - 75, sigYPos, pw - mr, sigYPos)
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(30, 41, 59)
      doc.text('Vo.Bo. del Solicitante', ml + 37.5, sigYPos + 4, { align: 'center' })
      doc.text('Autorización de la Coordinación', pw - mr - 37.5, sigYPos + 4, { align: 'center' })

      report.save(`Solicitud-${folio}.pdf`)
    } catch (e) {
      console.error('Error generando PDF de solicitud:', e)
    } finally {
      setExportandoPDF(false)
    }
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
        datosEspecificos: {
          apoyoEstacionamiento: editApoyoEstacionamiento,
          necesitaMantenimiento: editNecesitaMantenimiento,
          mantenimientoItems: editNecesitaMantenimiento === 'si' ? editMantenimientoItems : [],
          cantMesas: editNecesitaMantenimiento === 'si' ? editCantMesas : 0,
          cantSillas: editNecesitaMantenimiento === 'si' ? editCantSillas : 0,
          cantPanos: editNecesitaMantenimiento === 'si' ? editCantPanos : 0,
          gestionExternaItems: editNecesitaMantenimiento === 'si' ? editGestionExternaItems : [],
          necesitaAudiovisuales: editNecesitaAudiovisuales,
          audiovisualItems: editNecesitaAudiovisuales === 'si' ? editAudiovisualItems : [],
          audiovisualesOtrosTexto: editNecesitaAudiovisuales === 'si' && editAudiovisualItems.includes('Otros') ? editAudiovisualesOtrosTexto : '',
        },
      }
      await axios.put(`/api/solicitudes/${solicitud.id}`, dto)
      setEditando(false)
      onRefresh?.()
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response: { data: { error?: string } } }).response?.data?.error || 'Error al guardar los cambios'
        : 'Error al guardar los cambios'
      setError(msg)
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
            <button onClick={generarPDFSolicitud} disabled={exportandoPDF} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', padding: '0.4rem 0.9rem', background: exportandoPDF ? '#E2E8F0' : '#FFFFFF', color: exportandoPDF ? '#94A3B8' : '#1E3A8A', border: '1px solid #CBD5E1', borderRadius: '8px', fontWeight: 600, fontSize: '0.8rem', cursor: exportandoPDF ? 'not-allowed' : 'pointer', transition: 'all 0.15s ease' }}
              onMouseEnter={(e) => { if (!exportandoPDF) { e.currentTarget.style.background = '#F1F5F9'; e.currentTarget.style.borderColor = '#94A3B8'; } }}
              onMouseLeave={(e) => { if (!exportandoPDF) { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.borderColor = '#CBD5E1'; } }}
            >
              {exportandoPDF ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : '📄'} {exportandoPDF ? 'Exportando PDF...' : 'Exportar a PDF'}
            </button>
            {exportandoPDF && (
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
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

            {/* PESTAÑAS TIPO PÍLDORA */}
            <div style={{ background: '#F1F5F9', borderRadius: '40px', padding: '5px', display: 'flex', gap: '4px', width: 'fit-content', maxWidth: '100%' }}>
              <button type="button" disabled={paso === 1} onClick={() => setPaso(1)} style={{ flex: 1, padding: '0.6rem 2rem', borderRadius: '40px', border: 'none', background: paso === 1 ? '#1E3A8A' : 'transparent', color: paso === 1 ? '#FFFFFF' : '#64748B', fontWeight: 700, fontSize: '0.85rem', cursor: paso === 1 ? 'default' : 'pointer', transition: 'all 0.2s ease', whiteSpace: 'nowrap' }}>
                Datos Generales
              </button>
              <button type="button" disabled={paso === 2} onClick={() => setPaso(2)} style={{ flex: 1, padding: '0.6rem 2rem', borderRadius: '40px', border: 'none', background: paso === 2 ? '#1E3A8A' : 'transparent', color: paso === 2 ? '#FFFFFF' : '#64748B', fontWeight: 700, fontSize: '0.85rem', cursor: paso === 2 ? 'default' : 'pointer', transition: 'all 0.2s ease', whiteSpace: 'nowrap' }}>
                Datos Específicos
              </button>
            </div>

            {paso === 1 && (
            <><div style={{ ...sectionCardStyle }}>
              <h2 style={{ ...sectionHeaderStyle }}>Datos del Solicitante</h2>
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
            </>)}
            {paso === 2 && (
            <><div style={{ ...sectionCardStyle }}>
              <h2 style={{ ...sectionHeaderStyle }}>Logística y Requerimientos Específicos</h2>

              {!editando ? (() => {
                const de = solicitud.datosEspecificos as DatosEspecificos | null | undefined
                if (!de) return <p style={{ margin: 0, color: COLORS.textSecondary, fontSize: '0.85rem' }}>Sin requerimientos logísticos registrados.</p>

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    {/* Seguridad */}
                    <div>
                      <label style={labelStyle}>Apoyo estacionamiento / acceso</label>
                      <div style={{ marginTop: '0.25rem' }}>
                        <span style={{ display: 'inline-block', padding: '0.3rem 0.75rem', borderRadius: '20px', fontWeight: 600, fontSize: '0.8rem', background: de.apoyoEstacionamiento === 'si' ? '#DCFCE7' : '#F1F5F9', color: de.apoyoEstacionamiento === 'si' ? '#16A34A' : '#64748B' }}>{de.apoyoEstacionamiento === 'si' ? 'Sí' : 'No'}</span>
                      </div>
                    </div>

                    {/* Mantenimiento */}
                    <div>
                      <label style={labelStyle}>Apoyo de mantenimiento</label>
                      <div style={{ marginTop: '0.25rem' }}>
                        <span style={{ display: 'inline-block', padding: '0.3rem 0.75rem', borderRadius: '20px', fontWeight: 600, fontSize: '0.8rem', background: de.necesitaMantenimiento === 'si' ? '#DCFCE7' : '#F1F5F9', color: de.necesitaMantenimiento === 'si' ? '#16A34A' : '#64748B' }}>{de.necesitaMantenimiento === 'si' ? 'Sí' : 'No'}</span>
                      </div>
                      {de.necesitaMantenimiento === 'si' && (
                        <div style={{ marginTop: '0.75rem', marginLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          {de.mantenimientoItems && de.mantenimientoItems.length > 0 && (
                            <div><span style={{ fontWeight: 600, fontSize: '0.75rem', color: '#475569' }}>Equipo: </span>{de.mantenimientoItems.map((i: string) => {
                             const cant = i === 'Mesas' ? (de.cantMesas ?? 0) : i === 'Sillas' ? (de.cantSillas ?? 0) : i === 'Paños' ? (de.cantPanos ?? 0) : 0
                             return `${i}${cant > 0 ? ` (${cant})` : ''}`
                            }).join(' — ')}</div>
                          )}
                          {de.gestionExternaItems && de.gestionExternaItems.length > 0 && (
                            <div><span style={{ fontWeight: 600, fontSize: '0.75rem', color: '#475569' }}>Gestión externa: </span>{de.gestionExternaItems.join(' — ')}</div>
                          )}
                          {solicitud.croquisUrl && (
                            <div><span style={{ fontWeight: 600, fontSize: '0.75rem', color: '#475569' }}>Croquis: </span><a href={solicitud.croquisUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#2563EB', fontWeight: 600, fontSize: '0.8rem' }}>Ver croquis</a></div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Audiovisuales */}
                    <div>
                      <label style={labelStyle}>Apoyo audiovisual</label>
                      <div style={{ marginTop: '0.25rem' }}>
                        <span style={{ display: 'inline-block', padding: '0.3rem 0.75rem', borderRadius: '20px', fontWeight: 600, fontSize: '0.8rem', background: de.necesitaAudiovisuales === 'si' ? '#DCFCE7' : '#F1F5F9', color: de.necesitaAudiovisuales === 'si' ? '#16A34A' : '#64748B' }}>{de.necesitaAudiovisuales === 'si' ? 'Sí' : 'No'}</span>
                      </div>
                      {de.necesitaAudiovisuales === 'si' && de.audiovisualItems && de.audiovisualItems.length > 0 && (
                        <div style={{ marginTop: '0.5rem', marginLeft: '1rem' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.75rem', color: '#475569' }}>Equipo: </span>
                          {de.audiovisualItems.map((item, idx) => (
                            <span key={idx}>
                              {idx > 0 && <span> — </span>}
                              {item === 'Otros' && de.audiovisualesOtrosTexto ? `Otros (${de.audiovisualesOtrosTexto})` : item}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })() : (
                /* MODO EDICIÓN */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  <div>
                    <label style={labelStyle}>Apoyo para estacionamiento / acceso</label>
                    <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.3rem' }}>
                      {['si', 'no'].map((v) => (
                        <label key={v} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem', color: '#334155' }}>
                          <input type="radio" name="editEstacionamiento" value={v} checked={editApoyoEstacionamiento === v} onChange={(e) => setEditApoyoEstacionamiento(e.target.value)} style={{ accentColor: '#2563EB' }} />{v === 'si' ? 'Sí' : 'No'}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>¿Necesita apoyo de mantenimiento?</label>
                    <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.3rem' }}>
                      {['si', 'no'].map((v) => (
                        <label key={v} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem', color: '#334155' }}>
                          <input type="radio" name="editMantenimiento" value={v} checked={editNecesitaMantenimiento === v} onChange={(e) => setEditNecesitaMantenimiento(e.target.value)} style={{ accentColor: '#2563EB' }} />{v === 'si' ? 'Sí' : 'No'}
                        </label>
                      ))}
                    </div>
                    {editNecesitaMantenimiento === 'si' && (
                      <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.5rem' }}>
                          {['Pódium', 'Mesas', 'Sillas', 'Paños', 'Mesa para proyector', 'Extensión', 'Otro'].map((item) => (
                            <label key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 500, fontSize: '0.82rem', color: '#334155' }}>
                              <input type="checkbox" checked={editMantenimientoItems.includes(item)} onChange={() => setEditMantenimientoItems((prev) => prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item])} style={{ accentColor: '#2563EB' }} />{item}
                            </label>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                          {editMantenimientoItems.includes('Mesas') && (
                            <label style={{ fontSize: '0.8rem', fontWeight: 500, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>Mesas: <input type="number" min={0} value={editCantMesas} onChange={(e) => setEditCantMesas(Number(e.target.value))} style={{ width: '60px', ...inputStyle, padding: '0.3rem 0.4rem' }} /></label>
                          )}
                          {editMantenimientoItems.includes('Sillas') && (
                            <label style={{ fontSize: '0.8rem', fontWeight: 500, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>Sillas: <input type="number" min={0} value={editCantSillas} onChange={(e) => setEditCantSillas(Number(e.target.value))} style={{ width: '60px', ...inputStyle, padding: '0.3rem 0.4rem' }} /></label>
                          )}
                          {editMantenimientoItems.includes('Paños') && (
                            <label style={{ fontSize: '0.8rem', fontWeight: 500, color: '#334155', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>Paños: <input type="number" min={0} value={editCantPanos} onChange={(e) => setEditCantPanos(Number(e.target.value))} style={{ width: '60px', ...inputStyle, padding: '0.3rem 0.4rem' }} /></label>
                          )}
                        </div>
                        <div>
                          <label style={labelStyle}>Mobiliario Gestión Externa</label>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '0.5rem', marginTop: '0.25rem' }}>
                            {['Sillones sala de maestros', 'Sillones CIC', 'Mamparas', 'Letras logo UMAD'].map((item) => (
                              <label key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 500, fontSize: '0.82rem', color: '#334155' }}>
                                <input type="checkbox" checked={editGestionExternaItems.includes(item)} onChange={() => setEditGestionExternaItems((prev) => prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item])} style={{ accentColor: '#2563EB' }} />{item}
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={labelStyle}>¿Necesita apoyo audiovisual?</label>
                    <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.3rem' }}>
                      {['si', 'no'].map((v) => (
                        <label key={v} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem', color: '#334155' }}>
                          <input type="radio" name="editAudiovisual" value={v} checked={editNecesitaAudiovisuales === v} onChange={(e) => setEditNecesitaAudiovisuales(e.target.value)} style={{ accentColor: '#2563EB' }} />{v === 'si' ? 'Sí' : 'No'}
                        </label>
                      ))}
                    </div>
                    {editNecesitaAudiovisuales === 'si' && (
                      <>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.5rem', marginTop: '0.5rem' }}>
                          {['Sonido', 'Audio para computadora', 'Micrófono', 'Pantalla', 'Otros'].map((item) => (
                            <label key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontWeight: 500, fontSize: '0.82rem', color: '#334155' }}>
                              <input type="checkbox" checked={editAudiovisualItems.includes(item)} onChange={() => setEditAudiovisualItems((prev) => prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item])} style={{ accentColor: '#2563EB' }} />{item}
                            </label>
                          ))}
                        </div>
                        {editAudiovisualItems.includes('Otros') && (
                          <div style={{ marginTop: '0.5rem' }}>
                            <label style={{ display: 'block', fontWeight: 500, fontSize: '0.82rem', color: '#475569', marginBottom: '0.25rem' }}>
                              Especifique el apoyo o equipo requerido:
                            </label>
                            <input
                              type="text"
                              style={{ width: '100%', maxWidth: '400px', padding: '0.4rem 0.6rem', border: '1px solid #CBD5E1', borderRadius: '6px', fontSize: '0.85rem', outline: 'none' }}
                              placeholder="Ej. Proyector extra, cable HDMI de 10m..."
                              value={editAudiovisualesOtrosTexto}
                              onChange={(e) => setEditAudiovisualesOtrosTexto(e.target.value)}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
            </>)}

            {(solicitud?.estado === 'Aprobado') && (
              <div style={{ ...sectionCardStyle, border: `2px solid ${COLORS.primary}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    background: `linear-gradient(135deg, ${COLORS.primary}, ${COLORS.accent})`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <UserCheck size={16} color="white" />
                  </div>
                  <h2 style={{ ...sectionHeaderStyle, margin: 0, border: 'none', padding: 0, fontSize: '1rem' }}>
                    Asignación de Proveedores Externos
                  </h2>
                </div>
                <p style={{ margin: '0 0 1rem 2.5rem', fontSize: '0.8rem', color: COLORS.textSecondary }}>
                  Selecciona los proveedores externos asignados a este evento.
                </p>

                {successAsignacion && (
                  <div style={{ padding: '0.5rem 0.75rem', marginBottom: '0.75rem', background: '#DCFCE7', border: '1px solid #86EFAC', borderRadius: '8px', color: '#16A34A', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <CheckCircle size={14} /> {successAsignacion}
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {proveedores.length === 0 ? (
                    <p style={{ fontSize: '0.85rem', color: COLORS.textSecondary }}>Cargando proveedores...</p>
                  ) : (
                    proveedores.map((p) => (
                      <label
                        key={p.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '0.6rem',
                          padding: '0.5rem 0.75rem', borderRadius: '8px',
                          background: selectedProveedorIds.includes(p.id) ? '#EEF2FF' : '#F8FAFC',
                          border: `1.5px solid ${selectedProveedorIds.includes(p.id) ? COLORS.accent : COLORS.border}`,
                          cursor: 'pointer', transition: 'all 0.15s',
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedProveedorIds.includes(p.id)}
                          onChange={() => {
                            setSelectedProveedorIds((prev) =>
                              prev.includes(p.id) ? prev.filter((id) => id !== p.id) : [...prev, p.id]
                            )
                          }}
                          style={{ width: '1rem', height: '1rem', accentColor: COLORS.accent }}
                        />
                        <div style={{ flex: 1 }}>
                          <span style={{ fontWeight: 600, fontSize: '0.85rem', color: COLORS.textPrimary }}>{p.nombre}</span>
                          {p.especialidad && (
                            <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', color: COLORS.textSecondary }}>({p.especialidad})</span>
                          )}
                        </div>
                      </label>
                    ))
                  )}
                </div>

                <button
                  onClick={async () => {
                    setSavingAsignacion(true)
                    setSuccessAsignacion('')
                    try {
                      await axios.post(`/api/solicitudes/${solicitud.id}/asignar-proveedores`, {
                        proveedorIds: selectedProveedorIds,
                      })
                      setSuccessAsignacion('Asignación guardada correctamente')
                    } catch {
                      setError('Error al guardar la asignación de proveedores')
                    } finally {
                      setSavingAsignacion(false)
                    }
                  }}
                  disabled={savingAsignacion}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
                    padding: '0.55rem 1.25rem',
                    background: savingAsignacion ? '#94A3B8' : COLORS.accent,
                    color: COLORS.white, border: 'none', borderRadius: '8px',
                    fontWeight: 600, fontSize: '0.85rem', cursor: savingAsignacion ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {savingAsignacion ? 'Guardando...' : <>
                    <Save size={15} />
                    Guardar Asignación
                  </>}
                </button>
              </div>
            )}
          </div>
        ) : (
          <p style={{ textAlign: 'center', color: COLORS.textSecondary, fontSize: '0.9rem' }}>Cargando información de la solicitud...</p>
        )}
      </div>
    </div>
  )
}
