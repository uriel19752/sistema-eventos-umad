# Arquitectura Backend — TigreTrack

## Patrón: Controller → Service

El backend sigue un patrón de capas donde los **controladores** se encargan únicamente de la interacción HTTP, y los **servicios** contienen toda la lógica de negocio.

```
┌─────────────────────────────────────────────────┐
│                    Routes                        │
│     (definen endpoints y los asocian a          │
│      funciones del controlador)                 │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│                 Controllers                      │
│  • Reciben Request y Response de Express         │
│  • Extraen/validan datos del request             │
│  • Invocan métodos del servicio                  │
│  • Retornan respuestas HTTP                      │
│  • Manejan errores HTTP (400, 404, 500...)       │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│                   Services                       │
│  • Contienen toda la lógica de negocio           │
│  • Operan sobre Prisma, APIs externas, etc.      │
│  • Lanzan errores con statusCode para que el     │
│    controlador decida la respuesta HTTP          │
│  • No conocen Request/Response de Express        │
└────────────────────┬────────────────────────────┘
                     │
         ┌───────────┼───────────┐
         ▼           ▼           ▼
   ┌──────────┐ ┌──────────┐ ┌──────────┐
   │ Prisma   │ │ Mail     │ │ Google   │
   │ (DB)     │ │ Service  │ │ Calendar │
   └──────────┘ └──────────┘ └──────────┘
```

## Capas

### 1. DTOs (`src/dto/`)

Definen la forma de los datos que entran y salen de los servicios.

| Archivo | Propósito |
|---------|-----------|
| `crearSolicitud.dto.ts` | Datos necesarios para crear una solicitud |
| `actualizarEstado.dto.ts` | Datos necesarios para cambiar el estado |

### 2. Controladores (`src/controllers/`)

- Reciben `req` y `res` de Express.
- Extraen datos del body/params/query.
- Construyen DTOs y los pasan al servicio correspondiente.
- Retornan la respuesta HTTP con el código adecuado.
- En caso de error del servicio, capturan la excepción y convierten el `statusCode` en una respuesta HTTP.

### 3. Servicios (`src/services/`)

- `solicitud.service.ts` — Orquestación principal del CRUD de solicitudes.
- `mailService.ts` — Envío de correos electrónicos (Nodemailer + Gmail).
- `googleCalendarEvent.service.ts` — Creación/eliminación de eventos en Google Calendar.
- `googleCalendar.service.ts` — Cliente autenticado de Google Calendar API.

### 4. Config (`src/config/`)

- `db.ts` — Cliente singleton de Prisma.

## Flujo de datos

### Crear solicitud

```
POST /api/solicitudes
  → Controller: crearSolicitud
    → Construye CrearSolicitudDTO desde req.body
    → Service: crearSolicitud(dto)
      → Mapea materiales (Fotografia, Nota_Web, Banner, Otro)
      → Mapea ubicación (consulta plantel/institucion en DB)
      → Crea SolicitudEvento + MaterialSolicitado en Prisma
      → Envía email de alerta (no bloqueante, .catch())
      → Retorna solicitud creada
    → Controller: res.status(201).json({ id, folio, ... })
```

### Actualizar estado (aprobar/cancelar)

```
PATCH /api/solicitudes/:id/estado
  → Controller: actualizarEstado
    → Construye ActualizarEstadoDTO desde req.body
    → Service: actualizarEstado(id, dto)
      → Valida estado y existencia de solicitud
      → Si es Cancelada:
        → Transaction: update estado + crear AuditoriaCancelacion
        → Async: eliminarEventoSolicitud (Google Calendar)
        → Async: enviar email si es tardía (.catch())
      → Si es Aprobado:
        → update estado
        → Async: crearEventoSolicitud (Google Calendar)
      → Retorna solicitud actualizada
    → Controller: res.json(resultado)
```

## Manejo de errores

Los servicios lanzan errores con la propiedad `statusCode`:

| Condición | statusCode |
|-----------|------------|
| ID inválido | 400 |
| Estado inválido | 400 |
| Solicitud duplicada en mismo estado | 400 |
| Solicitud no encontrada | 404 |
| Error interno / base de datos | 500 (por defecto) |

El controlador captura el error y retorna:
```typescript
res.status(error.statusCode || 500).json({ error: message })
```

## Servicios externos (no bloqueantes)

- **Email**: se dispara con `.catch()` para no frenar la respuesta HTTP.
- **Google Calendar**: se ejecuta asíncronamente después de la respuesta.

## Compatibilidad

- Las rutas (`solicitud.routes.ts`) no cambiaron.
- Los contratos de API (request/response) son idénticos.
- El frontend no requiere modificaciones.
