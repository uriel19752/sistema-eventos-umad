# Google Calendar — Creación de Eventos

## ¿Cuándo se crea un evento?

Cuando una solicitud es aprobada (`estado === 'Aprobado'`), el backend
crea automáticamente un evento en Google Calendar institucional.

## Datos que se sincronizan

| Campo del evento | Origen en SolicitudEvento |
|---|---|
| `summary` | `Cobertura: {nombreEvento}` |
| `location` | `ubicacion` |
| `description` | Folio, solicitante, área, objetivo, ubicación, montaje, horarios, asistentes, observaciones |
| `start.dateTime` | `fechaEvento` + `horaInicio` |
| `end.dateTime` | `fechaEvento` + `horaFin` |
| `start.timeZone` | `America/Mexico_City` |
| `end.timeZone` | `America/Mexico_City` |

## Prevención de duplicados

Antes de insertar el evento, el servicio verifica si
`googleEventId` ya tiene un valor en la solicitud:

- Si **ya existe** → se omite la creación y se loguea:
  `[Google Calendar] Evento omitido: la solicitud X ya tiene evento`
- Si **no existe** → se crea el evento y se persiste el `eventId`
  devuelto por Google en el campo `googleEventId`.

## Flujo de aprobación

1. El admin cambia el estado a `'Aprobado'`.
2. Prisma actualiza la solicitud.
3. Se invoca `crearEventoSolicitud(solicitud)` (fire-and-forget).
4. Si Google responde con un `eventId`, se persiste en `googleEventId`.
5. Si Google falla, el error se registra en consola sin afectar la aprobación.

## Tolerancia a fallos

Todos los errores de Google Calendar se capturan con `try/catch` y
`.catch()` en la promesa. La solicitud siempre queda aprobada
independientemente del resultado de la sincronización.

## Logs

```
[Google Calendar] Evento creado: nombre (ID: abc123)
[Google Calendar] Evento omitido: la solicitud EVT-xxx ya tiene evento
[Google Calendar] Error creando evento: <detalle del error>
```
