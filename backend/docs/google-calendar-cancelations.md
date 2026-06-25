# Cancelaciones y Google Calendar

## ¿Cuándo se elimina el evento?

Cuando una solicitud cambia a estado `Cancelada`, el backend:

1. Actualiza la solicitud en base de datos a `Cancelada` y limpia el campo `googleEventId` (se establece como `null`).
2. Crea un registro de auditoría en `AuditoriaCancelacion`.
3. **Después** de la transacción, invoca `eliminarEventoSolicitud(googleEventId)` para eliminar el evento asociado en Google Calendar.

La eliminación del evento en Google Calendar ocurre **después** de que la cancelación ya se ha persistido en base de datos. Esto garantiza que la solicitud quede cancelada incluso si hay problemas de conexión con Google Calendar.

## ¿Qué ocurre si el evento ya no existe en Google Calendar?

Si el evento fue eliminado manualmente del calendario, la API de Google Calendar devuelve un error `404`. El método `eliminarEventoSolicitud` captura este error específico y registra:

```
[Google Calendar] Evento no encontrado en Calendar
```

La cancelación continúa sin interrupción.

## ¿Qué ocurre si Google Calendar no responde?

Si la API de Google Calendar no responde (timeout, error de red, etc.), el error se captura y registra:

```
[Google Calendar] Error eliminando evento: <mensaje de error>
```

La cancelación **nunca** se ve afectada. El evento podría quedar huérfano en Google Calendar, pero la solicitud queda correctamente cancelada en TigreTrack.

## ¿Qué ocurre si la solicitud no tiene `googleEventId`?

Si la solicitud fue creada antes de la integración con Google Calendar, o si la creación del evento falló al aprobarse, el campo `googleEventId` es `null`. En ese caso `eliminarEventoSolicitud` no hace ninguna llamada a la API y registra:

```
[Google Calendar] Evento omitido: la solicitud no posee googleEventId
```

## ¿Por qué la cancelación nunca debe fallar por errores externos?

La cancelación de una solicitud es una operación crítica que refleja una decisión administrativa. Depender de servicios externos (Google Calendar, correo electrónico) para completar la cancelación introduciría fragilidad:

- Si Google Calendar está caído, las solicitudes no se podrían cancelar.
- Un error transitorio de red impediría una cancelación urgente.

Por eso el flujo está diseñado para:

1. **Primero** persistir la cancelación en base de datos (dentro de una transacción).
2. **Después** intentar la eliminación del evento de Google Calendar de forma asíncrona y tolerante a fallos.

## Ampliaciones futuras

El patrón `eliminarEventoSolicitud` puede reutilizarse para:

- **Actualización de eventos**: cuando se modifica fecha, hora o lugar de una solicitud ya aprobada, se puede eliminar el evento existente y crear uno nuevo.
- **Reprogramación**: si una solicitud aprobada se pospone, se elimina el evento actual y se crea otro con los nuevos datos.
- **Rechazo administrativo**: si en el futuro se agrega un estado `Rechazada`, el mismo mecanismo aplica.

### Ejemplo de uso para actualización:

```typescript
// 1. Eliminar evento existente
await eliminarEventoSolicitud(solicitud.googleEventId)

// 2. Crear evento con datos actualizados
const nuevoEventId = await crearEventoSolicitud(solicitudActualizada)

// 3. Persistir el nuevo ID
await prisma.solicitudEvento.update({
  where: { id },
  data: { googleEventId: nuevoEventId },
})
```

## Código relevante

| Archivo | Propósito |
|---------|-----------|
| `src/services/googleCalendarEvent.service.ts` | Contiene `eliminarEventoSolicitud` |
| `src/controllers/solicitud.controller.ts` | Invoca `eliminarEventoSolicitud` en el flujo de cancelación |
| `src/services/googleCalendar.service.ts` | Cliente JWT de Google Calendar API |
