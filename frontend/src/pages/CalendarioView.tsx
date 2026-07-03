import { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import type { EventClickArg } from '@fullcalendar/core/index.js'
import SolicitudCompletaModal, { type SolicitudFields } from '../components/SolicitudCompletaModal'
import { COLORS } from '../theme/colors'

interface EventoCalendario {
  id: number
  title: string
  start: string
  end: string
  folio: string
  responsable: string
  lugar: string | null
  estado: string
  googleEventLink: string | null
}

interface EventoSeleccionado {
  id: number
  title: string
  folio: string
  start: string
  end: string
  lugar: string | null
  responsable: string
  estado: string
  googleEventLink: string | null
}

export default function CalendarioView({ userRol }: { userRol?: string }) {
  const [eventos, setEventos] = useState<EventoCalendario[]>([])
  const [seleccionado, setSeleccionado] = useState<EventoSeleccionado | null>(null)
  const [modalSolicitudCompleta, setModalSolicitudCompleta] = useState(false)
  const [solicitudActual, setSolicitudActual] = useState<SolicitudFields | null>(null)
  const calendarRef = useRef<FullCalendar>(null)

  useEffect(() => {
    axios.get('/api/calendario/eventos')
      .then((res) => setEventos(res.data))
      .catch((err) => console.error('Error fetching calendar events:', err))
  }, [])

  function handleEventClick(info: EventClickArg) {
    const e = info.event
    setSeleccionado({
      id: Number(e.id) || 0,
      title: e.title,
      folio: e.extendedProps['folio'] ?? '',
      start: e.start?.toISOString() ?? '',
      end: e.end?.toISOString() ?? '',
      lugar: e.extendedProps['lugar'] ?? null,
      responsable: e.extendedProps['responsable'] ?? '',
      estado: e.extendedProps['estado'] ?? '',
      googleEventLink: e.extendedProps['googleEventLink'] ?? null,
    })
  }

  function formatearFecha(iso: string): string {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  function formatearHora(iso: string): string {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleTimeString('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const colorEstado: Record<string, string> = {
    Pendiente: '#f59e0b',
    Aprobado: '#2563eb',
    Completada: '#16a34a',
    Cancelada: '#dc2626',
  }

  const eventosFC = eventos.map((e) => {
    const color = colorEstado[e.estado] || COLORS.primary
    return {
      id: String(e.id),
      title: e.title,
      start: e.start,
      end: e.end,
      backgroundColor: color,
      borderColor: color,
      textColor: '#ffffff',
      extendedProps: {
        folio: e.folio,
        responsable: e.responsable,
        lugar: e.lugar,
        estado: e.estado,
        googleEventLink: e.googleEventLink,
      },
    }
  })

  return (
    <div>
      {/* ===== ENCABEZADO DE PÁGINA ===== */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.7rem', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.2rem' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#E11D48', display: 'inline-block' }} />
            TigreTrack
          </div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em' }}>
            Calendario Institucional
          </h1>
          <p style={{ margin: '0.25rem 0 0', color: '#64748B', fontSize: '0.88rem', fontWeight: 400 }}>
            Eventos aprobados de cobertura en la plataforma
          </p>
        </div>
      </div>

      <div style={{
        background: '#FFFFFF',
        borderRadius: '16px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 1px 3px rgba(15,23,42,0.04)',
        padding: '1.5rem',
      }}>
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.3rem 0.9rem', borderRadius: '9999px', background: 'rgba(245,158,11,0.08)', border: '1.5px solid rgba(245,158,11,0.25)', fontSize: '0.78rem', fontWeight: 700, color: '#B45309', letterSpacing: '0.02em' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#F59E0B', display: 'inline-block', flexShrink: 0 }} />
            Pendiente
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.3rem 0.9rem', borderRadius: '9999px', background: 'rgba(37,99,235,0.08)', border: '1.5px solid rgba(37,99,235,0.25)', fontSize: '0.78rem', fontWeight: 700, color: '#1E40AF', letterSpacing: '0.02em' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#2563EB', display: 'inline-block', flexShrink: 0 }} />
            Aprobado
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.3rem 0.9rem', borderRadius: '9999px', background: 'rgba(22,163,74,0.08)', border: '1.5px solid rgba(22,163,74,0.25)', fontSize: '0.78rem', fontWeight: 700, color: '#166534', letterSpacing: '0.02em' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16A34A', display: 'inline-block', flexShrink: 0 }} />
            Completada
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.3rem 0.9rem', borderRadius: '9999px', background: 'rgba(220,38,38,0.08)', border: '1.5px solid rgba(220,38,38,0.25)', fontSize: '0.78rem', fontWeight: 700, color: '#991B1B', letterSpacing: '0.02em' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#DC2626', display: 'inline-block', flexShrink: 0 }} />
            Cancelada
          </div>
        </div>
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
          }}
          buttonText={{
            today: 'Hoy',
            month: 'Mes',
            week: 'Semana',
            day: 'Día',
            list: 'Lista',
          }}
          locale="es"
          events={eventosFC}
          eventClick={handleEventClick}
          height="auto"
          contentHeight="auto"
          firstDay={1}
          slotMinTime="06:00:00"
          slotMaxTime="23:00:00"
        />

        <style>{`
          .fc { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
          .fc-toolbar-title { font-size: 1.15rem !important; font-weight: 800 !important; color: #0F172A !important; letter-spacing: -0.02em !important; }
          .fc-button-primary { background: #1E3A8A !important; border-color: #1E3A8A !important; font-weight: 600 !important; font-size: 0.8rem !important; padding: 0.35rem 0.85rem !important; border-radius: 8px !important; box-shadow: none !important; }
          .fc-button-primary:hover { background: #162d6e !important; border-color: #162d6e !important; }
          .fc-button-primary:not(:disabled).fc-button-active { background: #E11D48 !important; border-color: #E11D48 !important; }
          .fc-button-primary:not(:disabled):active { background: #BE123C !important; border-color: #BE123C !important; }
          .fc .fc-button-primary:focus { box-shadow: 0 0 0 3px rgba(30,58,138,0.15) !important; }
          .fc .fc-daygrid-day-number { font-size: 0.85rem; font-weight: 600; color: #0F172A; padding: 0.35rem 0.5rem 0; }
          .fc .fc-col-header-cell-cushion { font-size: 0.75rem; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.06em; padding: 0.6rem 0; }
          .fc .fc-daygrid-day.fc-day-today { background: rgba(30,58,138,0.04) !important; }
          .fc .fc-daygrid-day.fc-day-today .fc-daygrid-day-number { background: transparent; color: #1E3A8A; font-weight: 800; }
          .fc .fc-event { border-radius: 6px; font-size: 0.75rem; font-weight: 600; padding: 0.1rem 0.2rem; cursor: pointer; border: none !important; }
          .fc .fc-timegrid-slot { height: 2rem; }
          .fc .fc-list-event-dot { border-color: inherit; }
          .fc .fc-list { border-radius: 8px; overflow: hidden; }
          .fc .fc-list-table th { font-size: 0.75rem; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.06em; background: #F8FAFC; padding: 0.6rem 0.75rem; }
          .fc .fc-list-event { cursor: pointer; transition: background 0.15s ease; }
          .fc .fc-list-event:hover { background: #F8FAFC; }
        `}</style>
      </div>

      {seleccionado && (
        <div
          onClick={() => setSeleccionado(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(6px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#FFFFFF',
              borderRadius: '20px',
              overflow: 'hidden',
              maxWidth: 500,
              width: '90%',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)',
            }}
          >
            {/* Header dinámico por estado */}
            <div style={{
              padding: '1.25rem 1.75rem',
              background: colorEstado[seleccionado.estado] || '#1E3A8A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#FFFFFF', letterSpacing: '-0.02em' }}>
                  {seleccionado.title}
                </h2>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>
                  Folio: {seleccionado.folio}
                </p>
              </div>
              <span style={{
                padding: '0.25rem 0.75rem',
                borderRadius: '9999px',
                fontSize: '0.68rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                background: 'rgba(255,255,255,0.2)',
                color: '#FFFFFF',
                whiteSpace: 'nowrap',
              }}>
                {seleccionado.estado}
              </span>
            </div>

            {/* Cuerpo del modal */}
            <div style={{ padding: '1.5rem 1.75rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={filaDetalle}>
                  <span style={labelDetalle}>Fecha</span>
                  <span style={valorDetalle}>{formatearFecha(seleccionado.start)}</span>
                </div>
                <div style={filaDetalle}>
                  <span style={labelDetalle}>Horario</span>
                  <span style={valorDetalle}>{formatearHora(seleccionado.start)} — {formatearHora(seleccionado.end)}</span>
                </div>
                {seleccionado.lugar && (
                  <div style={filaDetalle}>
                    <span style={labelDetalle}>Lugar</span>
                    <span style={valorDetalle}>{seleccionado.lugar}</span>
                  </div>
                )}
                <div style={filaDetalle}>
                  <span style={labelDetalle}>Responsable</span>
                  <span style={valorDetalle}>{seleccionado.responsable}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button
                  onClick={async () => {
                    setSolicitudActual(null)
                    setModalSolicitudCompleta(true)
                    try {
                      const res = await axios.get(`/api/solicitudes/${seleccionado.id}`)
                      setSolicitudActual(res.data)
                    } catch {
                      setSolicitudActual(null)
                    }
                  }}
                  style={{
                    flex: 1,
                    padding: '0.6rem 1rem',
                    background: '#1E3A8A',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    fontFamily: 'Inter, sans-serif',
                    transition: 'background 0.15s ease',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#162d6e'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#1E3A8A'}
                >
                  Ver Solicitud Completa
                </button>
                {userRol === 'ADMIN' && seleccionado.googleEventLink && (
                  <button
                    onClick={() => window.open(seleccionado.googleEventLink!, '_blank')}
                    style={{
                      flex: 1,
                      padding: '0.6rem 1rem',
                      background: '#FFFFFF',
                      color: '#1E3A8A',
                      border: '1.5px solid #1E3A8A',
                      borderRadius: '8px',
                      fontWeight: 600,
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      fontFamily: 'Inter, sans-serif',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#F8FAFC' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#FFFFFF' }}
                  >
                    Abrir en Google Calendar
                  </button>
                )}
              </div>

              <button
                onClick={() => setSeleccionado(null)}
                style={{
                  marginTop: '1rem',
                  width: '100%',
                  padding: '0.5rem',
                  background: 'transparent',
                  border: 'none',
                  color: '#64748B',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontFamily: 'Inter, sans-serif',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#0F172A'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#64748B'}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      <SolicitudCompletaModal
        open={modalSolicitudCompleta}
        onClose={() => { setModalSolicitudCompleta(false); setSolicitudActual(null) }}
        solicitud={solicitudActual}
        userRol={userRol}
      />
    </div>
  )
}

const filaDetalle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '0.5rem 0',
  borderBottom: '1px solid #f1f5f9',
}

const labelDetalle: React.CSSProperties = {
  color: COLORS.textSecondary,
  fontSize: '0.85rem',
  fontWeight: 500,
}

const valorDetalle: React.CSSProperties = {
  color: COLORS.textPrimary,
  fontSize: '0.9rem',
  fontWeight: 500,
  textAlign: 'right',
}
