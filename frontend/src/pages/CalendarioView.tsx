import { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import listPlugin from '@fullcalendar/list'
import type { EventClickArg } from '@fullcalendar/core/index.js'
import SolicitudCompletaModal, { type SolicitudFields } from '../components/SolicitudCompletaModal'

const COLORS = {
  primary: '#1e3a8a',
  accent: '#f59e0b',
  background: '#f8fafc',
  surface: '#ffffff',
  textPrimary: '#1e293b',
  textSecondary: '#64748b',
  white: '#ffffff',
}

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
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ color: COLORS.textPrimary, fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>
          Calendario Institucional
        </h1>
        <p style={{ color: COLORS.textSecondary, margin: '0.25rem 0 0' }}>
          Eventos aprobados de cobertura
        </p>
      </div>

      <div style={{
        background: COLORS.surface,
        borderRadius: 12,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        padding: '1.25rem',
      }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1rem', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', borderRadius: 8, background: '#fef3c7', fontSize: '0.8rem', fontWeight: 600, color: '#92400e' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
            Pendiente
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', borderRadius: 8, background: '#dbeafe', fontSize: '0.8rem', fontWeight: 600, color: '#1e40af' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#2563eb', display: 'inline-block' }} />
            Aprobado
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', borderRadius: 8, background: '#dcfce7', fontSize: '0.8rem', fontWeight: 600, color: '#166534' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
            Completada
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.35rem 0.75rem', borderRadius: 8, background: '#fee2e2', fontSize: '0.8rem', fontWeight: 600, color: '#991b1b' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />
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
      </div>

      {seleccionado && (
        <div
          onClick={() => setSeleccionado(null)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: COLORS.surface,
              borderRadius: 16,
              padding: '2rem',
              maxWidth: 480,
              width: '90%',
              boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: COLORS.accent,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1rem',
              fontSize: '1.25rem',
            }}>
              📅
            </div>

            <h2 style={{ color: COLORS.textPrimary, fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.25rem' }}>
              {seleccionado.title}
            </h2>
            <p style={{ color: COLORS.textSecondary, fontSize: '0.85rem', margin: '0 0 1.25rem' }}>
              Folio: {seleccionado.folio}
            </p>

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
              <div style={filaDetalle}>
                <span style={labelDetalle}>Estado</span>
                <span style={{
                  ...valorDetalle,
                  color: COLORS.accent,
                  fontWeight: 600,
                }}>
                  {seleccionado.estado}
                </span>
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
                  background: COLORS.primary,
                  color: COLORS.white,
                  border: 'none',
                  borderRadius: 8,
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                }}
              >
                Ver Solicitud Completa
              </button>
              {userRol === 'ADMIN' && seleccionado.googleEventLink && (
                <button
                  onClick={() => window.open(seleccionado.googleEventLink!, '_blank')}
                  style={{
                    flex: 1,
                    padding: '0.6rem 1rem',
                    background: COLORS.white,
                    color: COLORS.primary,
                    border: `2px solid ${COLORS.primary}`,
                    borderRadius: 8,
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                  }}
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
                color: COLORS.textSecondary,
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.85rem',
              }}
            >
              Cerrar
            </button>
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
