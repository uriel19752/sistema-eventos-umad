# Reporte Semanal de Desarrollo — Semana 1

**Período:** 22 de junio al 28 de junio de 2026
**Proyecto:** TigreTrack — Sistema de Gestión de Eventos UMAD
**Desarrollador:** Uriel Calyeca

---

## Resumen Ejecutivo

Esta semana se consolidó una **versión estable** del sistema con hitos importantes: integración completa con Google Calendar, nueva vista de calendario, panel de estadísticas, capa de servicios backend, sistema de auditoría y recordatorios programados. Se agregaron logos institucionales y documentación técnica. Se refactorizó la arquitectura separando la lógica de negocio de los controladores hacia servicios dedicados.

---

## Commits del Período

| Commit | Fecha | Mensaje | Archivos | ± Líneas |
|--------|-------|---------|----------|----------|
| `20e96b3` | 2026-06-25 | Versión estable: conflictos, Google Calendar, QR y corrección de ubicación | 160 | +5728 / -526 |

> El commit `b6b1fce` (Jun 17, fix: correciones controller solicitud) corresponde a la semana anterior pero sentó las bases para esta release estable.

---

## Backend

### Nuevos Servicios

| Archivo | Líneas | Descripción |
|---------|--------|-------------|
| `src/services/solicitud.service.ts` | 464 | Capa de negocio: CRUD de solicitudes desacoplado del controlador |
| `src/services/reminder.service.ts` | 103 | Servicio de recordatorios programados vía correo |
| `src/services/googleCalendar.service.ts` | 48 | Cliente autenticado de Google Calendar API v3 |
| `src/services/googleCalendarEvent.service.ts` | 143 | Creación/eliminación de eventos en Google Calendar |

### Nuevos Controladores

| Archivo | Líneas | Descripción |
|---------|--------|-------------|
| `src/controllers/auditoria.controller.ts` | 19 | Registro de auditoría de cancelaciones |
| `src/controllers/calendario.controller.ts` | 48 | Endpoints para consultar eventos del calendario |
| `src/controllers/material.controller.ts` | — | Gestión de materiales solicitados |

### Nuevos DTOs

| Archivo | Descripción |
|---------|-------------|
| `src/dto/crearSolicitud.dto.ts` | Validación de datos para creación de solicitudes |
| `src/dto/actualizarEstado.dto.ts` | Validación para cambios de estado (aprobar/cancelar) |

### Nuevo Middleware

| Archivo | Descripción |
|---------|-------------|
| `src/middleware/auth.middleware.ts` | Autenticación JWT con roles (admin, gestor, analista, solicitante) |

### Nuevo Job Programado

| Archivo | Descripción |
|---------|-------------|
| `src/jobs/reminder.job.ts` | Cron job para envío automático de recordatorios |

### Base de Datos — Migraciones

| Migración | Descripción |
|-----------|-------------|
| `20260622183532_add_usuario_relation_to_solicitudes` | Relación usuario-solicitud para segmentación por rol |
| `20260623130827_add_event_reminder_flags` | Banderas para control de recordatorios |
| `20260623141717_add_google_event_link` | Campo `googleEventId` para vincular eventos de calendario |

### Configuración

- Express types extendidos (`types/express.d.ts`) para usuario autenticado en request
- Dependencias añadidas: `googleapis`, `node-cron`, `bcrypt`, `jsonwebtoken`, `pdfkit`, `exceljs`
- Archivos compilados JS generados para todos los módulos TypeScript

---

## Frontend

### Nuevas Páginas

| Archivo | Líneas | Descripción |
|---------|--------|-------------|
| `src/pages/CalendarioView.tsx` | 352 | Vista de calendario con FullCalendar (month, week, day, list) |
| `src/pages/EstadisticasView.tsx` | 204 | Panel de estadísticas y analíticas |

### Nuevos Componentes

| Archivo | Líneas | Descripción |
|---------|--------|-------------|
| `src/components/SolicitudCompletaModal.tsx` | 199 | Modal de lectura para inspeccionar solicitud completa |

### Páginas Modificadas

| Archivo | Cambio |
|---------|--------|
| `src/pages/Dashboard.tsx` | Integración con calendario y datos reales desde API |
| `src/pages/Evaluar.tsx` | Mejoras en flujo de evaluación (aprobar/rechazar) |
| `src/pages/Login.tsx` | Refinamientos de UI |
| `src/pages/NuevaSolicitud.tsx` | Ajustes en formulario |

### Nuevos Assets

| Archivo | Descripción |
|---------|-------------|
| `src/assets/logos/umad_logo.png` | Logo Universidad Madero |
| `src/assets/logos/prepa_umad_logo.png` | Logo Prepa UMAD |
| `src/assets/logos/imm_logo.png` | Logo Instituto Mexicano Madero |

### Dependencias Añadidas

`@fullcalendar/react`, `@fullcalendar/daygrid`, `@fullcalendar/timegrid`, `@fullcalendar/list`, `@fullcalendar/interaction`, `recharts`, `lucide-react`, `html2pdf.js`, `qrcode.react`

---

## Documentación

| Archivo | Descripción |
|---------|-------------|
| `spec.md` | Nueva especificación del proyecto (reemplaza `project_spec.md`) |
| `backend/docs/architecture.md` | Documentación de arquitectura backend (patrón Controller → Service) |
| `backend/docs/google-calendar-setup.md` | Guía de configuración de Google Calendar API |
| `backend/docs/google-calendar-events.md` | Documentación del flujo de eventos de calendario |
| `backend/docs/google-calendar-cancelations.md` | Documentación de cancelaciones vía calendario |

---

## Skill de Agente (AI Agent)

Se agregaron skills para el asistente de desarrollo:
- **Accesibilidad** (`accessibility/`) — Guías WCAG y patrones accesibles
- **Frontend Design** (`frontend-design/`) — Lineamientos de diseño UI
- **SEO** (`seo/`) — Optimización para buscadores

---

## Estadísticas

| Métrica | Valor |
|---------|-------|
| Archivos cambiados | 160 |
| Líneas agregadas | 5,728 |
| Líneas eliminadas | 526 |
| Nuevos controladores | 3 |
| Nuevos servicios | 4 |
| Nuevas páginas frontend | 2 |
| Nuevos componentes | 1 |
| Migraciones BD | 3 |
| Nuevos documentos | 5 |

---

## Estado General

El sistema alcanzó una **versión estable** con integración funcional de Google Calendar, autenticación JWT por roles, recordatorios automáticos, panel de calendario y estadísticas. La arquitectura se profesionalizó con separación de capas (Controller → Service → DTO).
