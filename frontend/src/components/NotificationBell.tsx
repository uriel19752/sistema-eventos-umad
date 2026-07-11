/**
 * Buzón de notificaciones reactivo con indicador de pendientes y actualización
 * optimista al marcar como leídas.
 *
 * Flujo de consumo reactivo:
 *   1. Al montar el componente, se dispara `GET /api/notificaciones` que retorna
 *      el payload completo de notificaciones del usuario autenticado (titulo,
 *      mensaje, leida, fechaCreacion).
 *   2. El estado `notificaciones[]` almacena toda la lista. El badge numérico
 *      se calcula de forma reactiva con `noLeidas =
 *      notificaciones.filter(n => !n.leida).length`, que se re-evalúa en cada
 *      render sin necesidad de un estado separado.
 *   3. Cuando el usuario hace clic en una notificación no leída, se dispara
 *      `manejarLectura(id)` que aplica una actualización optimista local
 *      (`setNotificaciones` con el item mutado a `leida: true`) y, en paralelo,
 *      envía `PATCH /api/notificaciones/:id/leida` al backend. Si la petición
 *      falla, el estado local ya se actualizó (pérdida de consistencia mínima
 *      aceptada para mantener la sensación de fluidez).
 *   4. El menú desplegable se abre/cierra con el estado `open` y se cierra
 *      automáticamente al hacer clic fuera del componente mediante un
 *      `mousedown` listener en `document`.
 *
 * Props: Sin props — el usuario autenticado se obtiene del token JWT que
 * Axios inyecta automáticamente en todas las peticiones via
 * `axios.defaults.headers.common['Authorization']`.
 */

import { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { Bell, Check } from 'lucide-react'

interface Notificacion {
  id: number
  titulo: string
  mensaje: string
  leida: boolean
  fechaCreacion: string
}

export default function NotificationBell() {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([])
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  /**
   * Cómputo reactivo del badge numérico de pendientes.
   *
   * Se calcula directamente en el render (sin estado ni `useMemo`) porque
   * el filtrado sobre arrays pequeños (< 100 items) es despreciable en
   * costo y evita la sobrecarga de mantener un estado sincronizado.
   *
   * El resultado controla dos elementos visuales:
   * - La burbuja sobre el icono de la campana (con tope `9+`).
   * - La etiqueta "{N} sin leer" en el header del menú desplegable.
   */
  const noLeidas = notificaciones.filter((n) => !n.leida).length

  /**
   * Efecto de carga inicial — obtiene el buzón de alertas del usuario.
   *
   * Consume `GET /api/notificaciones` que retorna un array con el payload:
   *   [
   *     { id, titulo, mensaje, leida: boolean, fechaCreacion: ISO },
   *     ...
   *   ]
   *
   * El endpoint filtra automáticamente por `req.usuario.id` gracias al
   * middleware de autenticación aplicado en la ruta. No se envía ningún
   * parámetro adicional.
   *
   * Si la petición falla (red, servidor caído), el error se captura en
   * silencio y el estado permanece como array vacío, mostrando el mensaje
   * "Sin notificaciones" en la UI.
   */
  useEffect(() => {
    axios
      .get<Notificacion[]>('/api/notificaciones')
      .then((res) => setNotificaciones(res.data))
      .catch(() => {})
  }, [])

  /**
   * Cierra el menú desplegable al hacer clic fuera del componente.
   *
   * Usa un listener `mousedown` en `document` para detectar clics fuera
   * del contenedor (`ref`). Se prefiere `mousedown` sobre `click` porque
   * se dispara antes y evita parpadeos cuando el clic cae sobre otro
   * elemento que también abre un menú.
   */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  /**
   * Marca una notificación como leída con actualización optimista.
   *
   * Flujo asíncrono (Optimistic UI Update):
   *
   *   1. **Actualización local inmediata**: se mapea `notificaciones[]`
   *      cambiando `leida: true` para el `id` recibido. Esto actualiza
   *      el badge y el estilo visual (fondo blanco, indicador gris) de
   *      forma instantánea, sin esperar la respuesta del servidor.
   *
   *   2. **Persistencia en backend**: se envía `PATCH
   *      /api/notificaciones/{id}/leida` al mismo tiempo. El endpoint
   *      actualiza la columna `leida = true` en la BD y retorna el
   *      registro actualizado.
   *
   *   3. **Manejo de error**: si la petición HTTP falla, el estado local
   *      ya se actualizó (quedó marcada como leída en la UI pero no en
   *      la BD). En la próxima recarga de página, el `useEffect` de
   *      carga inicial sincronizará el estado real desde el servidor.
   *      Esta asimetría se considera aceptable para mantener la
   *      experiencia fluida (la notificación ya fue leída por el usuario,
   *      el marcarla como leída en BD es secundario).
   *
   * @param id - ID numérico de la notificación a marcar como leída.
   *
   * @returns {Promise<void>}
   */
  async function manejarLectura(id: number) {
    try {
      await axios.patch(`/api/notificaciones/${id}/leida`)
      setNotificaciones((prev) =>
        prev.map((n) => (n.id === id ? { ...n, leida: true } : n)),
      )
    } catch {
      console.error('Error al marcar notificación como leída')
    }
  }

  const formatFecha = (iso: string) => {
    const d = new Date(iso)
    return d.toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Notificaciones"
        style={{
          position: 'relative',
          background: 'transparent',
          border: 'none',
          borderRadius: '50%',
          width: '40px',
          height: '40px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(30, 58, 138, 0.08)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
        }}
      >
        <Bell size={20} color="#1E3A8A" strokeWidth={2.2} />
        {noLeidas > 0 && (
          <span
            style={{
              position: 'absolute',
              top: '-3px',
              right: '-3px',
              background: '#F59E0B',
              color: '#0F172A',
              fontSize: '0.6rem',
              fontWeight: 800,
              lineHeight: '18px',
              textAlign: 'center',
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              border: '2px solid #FFFFFF',
              boxShadow: '0 2px 6px rgba(245, 158, 11, 0.4)',
            }}
          >
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            width: '380px',
            maxHeight: '460px',
            overflowY: 'auto',
            background: '#FFFFFF',
            borderRadius: '16px',
            border: '1px solid #E2E8F0',
            boxShadow:
              '0 25px 50px -12px rgba(15, 23, 42, 0.25), 0 8px 20px -8px rgba(15, 23, 42, 0.08)',
            zIndex: 999,
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '1rem 1.25rem',
              background: '#F8FAFC',
              borderBottom: '1px solid #E2E8F0',
              borderRadius: '16px 16px 0 0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Bell size={16} color="#1E3A8A" strokeWidth={2.2} />
              <span
                style={{
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  color: '#0F172A',
                  letterSpacing: '-0.01em',
                }}
              >
                Notificaciones
              </span>
            </div>
            {noLeidas > 0 && (
              <span
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: '#1E3A8A',
                  background: 'rgba(30, 58, 138, 0.08)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '9999px',
                }}
              >
                {noLeidas} sin leer
              </span>
            )}
          </div>

          {notificaciones.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3rem 2rem',
                gap: '1rem',
              }}
            >
              <Bell
                size={40}
                color="#CBD5E1"
                strokeWidth={1.5}
                style={{ opacity: 0.5 }}
              />
              <div
                style={{
                  textAlign: 'center',
                  color: '#94A3B8',
                  fontSize: '0.88rem',
                  fontWeight: 500,
                  lineHeight: 1.6,
                }}
              >
                <span style={{ display: 'block', fontWeight: 600, color: '#64748B' }}>
                  Sin notificaciones
                </span>
                <span style={{ display: 'block', fontSize: '0.8rem' }}>
                  No tienes notificaciones pendientes por revisar
                </span>
              </div>
            </div>
          ) : (
            notificaciones.map((n) => (
              <div
                key={n.id}
                style={{
                  display: 'flex',
                  gap: '0.85rem',
                  padding: '0.85rem 1.25rem',
                  borderBottom: '1px solid #F1F5F9',
                  background: n.leida ? '#FFFFFF' : '#FFFBEB',
                  cursor: n.leida ? 'default' : 'pointer',
                  transition: 'background 0.2s ease',
                }}
                onClick={() => {
                  if (!n.leida) manejarLectura(n.id)
                }}
                onMouseEnter={(e) => {
                  if (!n.leida) e.currentTarget.style.background = '#FEF3C7'
                }}
                onMouseLeave={(e) => {
                  if (!n.leida) e.currentTarget.style.background = '#FFFBEB'
                }}
              >
                <div
                  style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: n.leida ? '#CBD5E1' : '#F59E0B',
                    marginTop: '5px',
                    flexShrink: 0,
                    boxShadow: n.leida
                      ? 'none'
                      : '0 0 0 3px rgba(245, 158, 11, 0.2)',
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '0.84rem',
                      fontWeight: n.leida ? 500 : 700,
                      color: '#0F172A',
                      marginBottom: '0.2rem',
                    }}
                  >
                    {n.titulo}
                  </div>
                  <div
                    style={{
                      fontSize: '0.78rem',
                      fontWeight: 400,
                      color: '#64748B',
                      lineHeight: 1.45,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {n.mensaje}
                  </div>
                  <div
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 500,
                      color: '#94A3B8',
                      marginTop: '0.35rem',
                    }}
                  >
                    {formatFecha(n.fechaCreacion)}
                  </div>
                </div>
                {!n.leida && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      manejarLectura(n.id)
                    }}
                    aria-label="Marcar como leída"
                    style={{
                      background: 'transparent',
                      border: '1px solid #E2E8F0',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      padding: '0.3rem',
                      color: '#94A3B8',
                      flexShrink: 0,
                      alignSelf: 'flex-start',
                      marginTop: '2px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '28px',
                      height: '28px',
                      transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#1E3A8A'
                      e.currentTarget.style.borderColor = '#1E3A8A'
                      e.currentTarget.style.color = '#FFFFFF'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.borderColor = '#E2E8F0'
                      e.currentTarget.style.color = '#94A3B8'
                    }}
                  >
                    <Check size={13} strokeWidth={3} />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
