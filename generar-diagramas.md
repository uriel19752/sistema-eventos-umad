# Prompt para Generar Diagramas del Sistema TigreTrack

Usa este documento como contexto para que otra IA genere los diagramas solicitados.

---

## Contexto del Proyecto

**Nombre:** TigreTrack — Sistema de Gestión de Eventos Institucionales
**Institución:** Universidad Madero (UMAD), Prepa UMAD, Instituto Mexicano Madero (IMM)
**Stack técnico:**
- **Backend:** Node.js + Express 5 + TypeScript + Prisma ORM + PostgreSQL
- **Frontend:** React 19 + Vite 8 + TypeScript + React Router 7
- **Autenticación:** JWT con roles (ADMIN / USER)
- **Servicios externos:** Google Calendar API v3, Nodemailer (Gmail SMTP)
- **Gráficos:** Recharts (frontend), ChartJS-node-canvas (backend PDF)

---

## Enumeraciones del Sistema

```typescript
enum Prioridad { Alta, Media, Baja }
enum Estado { Pendiente, Aprobado, Completada, Cancelada }
enum Rol { ADMIN, USER }
enum TipoMaterial { Fotografia, Nota_Web, Banner, Otro }
```

---

## Modelo de Datos (Prisma Schema)

### Tabla: Usuario (`usuarios`)
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | Int (PK) | Auto incremental |
| correo | String (unique) | Correo institucional |
| password | String | Hash bcrypt |
| rol | Rol (enum) | ADMIN o USER |

Relaciones: tiene muchas `SolicitudEvento`, tiene muchas `Notificacion`

### Tabla: Plantel (`planteles`)
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | Int (PK) | Auto incremental |
| nombre | String | Ej: "UMAD Campus Puebla", "IMM Campus Centro" |

Relaciones: tiene muchas `SolicitudEvento`

### Tabla: Institucion (`instituciones`)
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | Int (PK) | Auto incremental |
| nombre | String | Ej: "UMAD", "IMM", "Prepa UMAD" |

Relaciones: tiene muchas `SolicitudEvento`

### Tabla: Proveedor (`proveedores`)
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | Int (PK) | Auto incremental |
| nombre | String | Nombre del proveedor |
| especialidad | String? | Rubro de especialidad |
| email | String? | Correo de contacto |
| telefono | String? | Teléfono |
| activo | Boolean | Si está activo (default: true) |

Relaciones: tiene muchas `AsignacionProveedor`

### Tabla: SolicitudEvento (`solicitudes_eventos`) — **Tabla central**
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | Int (PK) | Auto incremental |
| folio | String | Folio único de solicitud |
| nombreEvento | String | Nombre del evento |
| descripcion | String? | Descripción general |
| objetivoCobertura | String? | Objetivo de la cobertura |
| publicoObjetivo | String? | Público objetivo |
| autoridadesAsistentes | String? | Autoridades presentes |
| plantelId | Int? (FK → Plantel) | Plantel donde ocurre |
| institucionId | Int? (FK → Institucion) | Institución solicitante |
| lugarEspecifico | String? | Lugar dentro del plantel |
| ubicacion | String? | Dirección/ubicación |
| fechaEvento | Date | Fecha del evento |
| horaInicio | Time | Hora de inicio |
| horaFin | Time | Hora de término |
| horaMontaje | Time? | Hora de montaje/preparativos |
| fechaSolicitud | DateTime (default now) | Fecha de registro |
| responsableNombre | String | Nombre del responsable |
| contacto | String? | Información de contacto |
| departamentoSolicitante | String? | Departamento que solicita |
| institucionPersonalizada | String? | Institución escrita libre |
| datosEspecificos | Json? | Datos adicionales en JSON |
| croquisUrl | String? | URL del croquis/plano |
| observaciones | String? | Observaciones |
| prioridad | Prioridad (enum) | Alta, Media, Baja |
| estado | Estado (enum) | Pendiente, Aprobado, Completada, Cancelada |
| googleEventId | String? | ID del evento en Google Calendar |
| googleEventLink | String? | Link del evento en Google Calendar |
| recordatorio7DiasEnviado | Boolean | Control de recordatorio (7 días) |
| recordatorio24HorasEnviado | Boolean | Control de recordatorio (24 h) |
| usuarioId | Int? (FK → Usuario) | Usuario que creó la solicitud |

**Relaciones:**
- Pertenece a `Usuario` (opcional)
- Pertenece a `Plantel` (opcional)
- Pertenece a `Institucion` (opcional)
- Tiene muchos `MaterialSolicitado`
- Tiene muchas `AsignacionProveedor`
- Tiene muchas `EncuestaSatisfaccion`
- Tiene muchas `AuditoriaCancelacion`

### Tabla: MaterialSolicitado (`materiales_solicitados`)
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | Int (PK) | Auto incremental |
| solicitudId | Int (FK → SolicitudEvento) | Solicitud relacionada |
| tipoMaterial | TipoMaterial (enum) | Fotografia, Nota_Web, Banner, Otro |
| descripcionOtro | String? | Descripción si es "Otro" |

### Tabla: AsignacionProveedor (`asignacion_proveedores`)
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | Int (PK) | Auto incremental |
| solicitudId | Int (FK → SolicitudEvento) | Solicitud relacionada |
| proveedorId | Int (FK → Proveedor) | Proveedor asignado |

### Tabla: EncuestaSatisfaccion (`encuestas_satisfaccion`)
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | Int (PK) | Auto incremental |
| solicitudId | Int (FK → SolicitudEvento) | Solicitud evaluada |
| puntualidad | Int (0-5) | Calificación de puntualidad |
| calidadTecnica | Int (0-5) | Calificación técnica |
| atencionStaff | Int (0-5) | Atención del staff |
| satisfaccionGral | Int (0-5) | Satisfacción general |
| comentarios | String? | Comentario de texto libre |
| fechaRespuesta | DateTime (default now) | Fecha de respuesta |

### Tabla: AuditoriaCancelacion (`auditoria_cancelaciones`)
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | Int (PK) | Auto incremental |
| solicitudId | Int (FK → SolicitudEvento) | Solicitud cancelada |
| estadoAnterior | Estado (enum) | Estado antes de cancelar |
| fechaCancelacion | DateTime (default now) | Fecha de cancelación |
| motivo | String? | Motivo de cancelación |
| tardia | Boolean | Si fue cancelación tardía (< 48h antes) |

### Tabla: Notificacion (`notificaciones`)
| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | Int (PK) | Auto incremental |
| usuarioId | Int (FK → Usuario) | Usuario destino |
| titulo | String | Título de la notificación |
| mensaje | String | Cuerpo del mensaje |
| leida | Boolean | Si fue leída (default: false) |
| fechaCreacion | DateTime (default now) | Fecha de creación |

---

## API REST — Endpoints

### Autenticación
- `POST /api/auth/login` — Login con correo y password, retorna JWT
- `POST /api/auth/register` — Registro de nuevo usuario

### Solicitudes
- `GET /api/solicitudes` — Listar solicitudes (ADMIN: todas, USER: solo las suyas)
- `POST /api/solicitudes` — Crear nueva solicitud
- `GET /api/solicitudes/:id` — Obtener detalle de solicitud
- `PATCH /api/solicitudes/:id/estado` — Cambiar estado (aprobar/cancelar/completar)
- `PUT /api/solicitudes/:id` — Editar solicitud
- `GET /api/solicitudes/publica/:id` — Obtener nombre del evento (público)

### Catálogos
- `GET /api/catalogo/planteles` — Listar planteles
- `GET /api/catalogo/instituciones` — Listar instituciones
- `GET /api/catalogo/proveedores` — Listar proveedores

### Encuestas
- `POST /api/encuestas` — Registrar encuesta de satisfacción
- `GET /api/encuestas/solicitud/:solicitudId` — Obtener encuestas de una solicitud

### Calendario
- `GET /api/calendario/eventos` — Obtener eventos del calendario (aprobados)

### Materiales
- `GET /api/materiales` — Listar materiales solicitados

### Auditoría
- `GET /api/auditoria/cancelaciones` — Listar registro de cancelaciones

### Estadísticas
- `GET /api/estadisticas/dashboard` — Dashboard completo con filtros (plantel, institucion, fechaInicio, fechaFin). Retorna: contadores por estado, distribución por plantel/institución/material, tendencias mensuales, promedios de encuesta, CSAT, insights.

### Notificaciones
- `GET /api/notificaciones` — Listar notificaciones del usuario
- `PATCH /api/notificaciones/:id/leida` — Marcar como leída

### Reportes
- `GET /api/reportes/satisfaccion/pdf` — Exportar PDF de satisfacción y calidad
- `GET /api/reportes/satisfaccion/excel` — Exportar Excel de satisfacción y calidad

---

## Flujos de Negocio Clave

### 1. Creación de Solicitud
1. Usuario llena formulario (4 secciones: Datos del Área, Información del Evento, Objetivo y Logística, Material Requerido)
2. Frontend envía POST /api/solicitudes con datos + JWT
3. Backend valida horas (horaFin > horaInicio, horaMontaje ≤ horaInicio)
4. Backend deduce plantelId e institucionId según el lugar seleccionado
5. Backend crea SolicitudEvento + MaterialSolicitado en transacción
6. Backend envía email de alerta a administradores (no bloqueante)
7. Backend crea notificaciones a todos los ADMIN (no bloqueante)
8. Retorna solicitud creada con estado "Pendiente"

### 2. Aprobación de Solicitud
1. ADMIN o Gestor accede a vista de evaluación
2. Envía PATCH /api/solicitudes/:id/estado con `{ estado: "Aprobado" }`
3. Backend valida: existencia, permisos, estado actual diferente, conflictos de horario (mismo plantel/fecha)
4. Si hay conflicto horario, retorna error 409 con lista de conflictos y flag `warning: true`. Frontend pregunta si desea forzar.
5. Si se fuerza, se reenvía con `{ forzar: true }`
6. Backend actualiza estado a "Aprobado"
7. Backend crea evento en Google Calendar (no bloqueante)
8. Backend actualiza solicitud con googleEventId y googleEventLink
9. Backend envía correo de aprobación al solicitante (no bloqueante)
10. Backend crea notificación al usuario

### 3. Cancelación de Solicitud
1. Usuario o ADMIN cancela desde la interfaz
2. Modal de confirmación con campo "Motivo (opcional)"
3. Envía PATCH /api/solicitudes/:id/estado con `{ estado: "Cancelada", motivo: "..." }`
4. Backend calcula si es tardía (< 48h hasta el evento)
5. Transacción: actualiza estado a Cancelada + crea AuditoriaCancelacion con flag `tardia`
6. Si tiene googleEventId, elimina el evento de Google Calendar
7. Si es tardía, envía alerta especial por correo a administradores
8. Envía correo de cancelación al solicitante
9. Crea notificación al usuario

### 4. Edición de Solicitud
1. Usuario o ADMIN edita la solicitud
2. No se permite editar si estado es "Completada" o "Cancelada"
3. Se reemplazan los materiales solicitados (deleteMany + createMany)
4. Si la edita un ADMIN, notifica al solicitante
5. Si la edita un USER, notifica a todos los ADMIN

### 5. Recordatorio Automático (Cron Job)
1. Cron job ejecuta recordatorio.
2. Busca solicitudes con estado "Aprobado" y fechaEvento = mañana
3. Para cada una, crea notificaciones al usuario solicitante + todos los ADMIN
4. Evita duplicados (verifica si ya se notificó hoy el mismo folio al mismo usuario)

### 6. Encuesta de Satisfacción
1. El usuario accede a un enlace de evaluación (ruta pública `/evaluar/:id`)
2. Califica: puntualidad, calidad técnica, atención del staff, satisfacción general (1-5)
3. Comentario opcional
4. POST /api/encuestas con `{ solicitudId, puntualidad, calidadTecnica, atencionStaff, satisfaccionGral, comentarios }`

### 7. Dashboard de Estadísticas
1. GET /api/estadisticas/dashboard con filtros opcionales
2. Retorna:
   - Contadores: total, pendientes, aprobadas, completadas, canceladas
   - Distribución: por plantel, institución, tipo de material
   - Tendencia mensual (12 meses)
   - Variación vs mes anterior
   - Promedios de encuesta (puntualidad, calidad técnica, atención, satisfacción general)
   - Distribución de estrellas (1-5)
   - CSAT con variación vs período anterior
   - Diagnóstico automático de calidad
   - Insights: plantel líder, institución líder, mes más activo, tasa de cancelación

---

## Routing del Frontend

| Ruta | Componente | Descripción |
|------|-----------|-------------|
| `/login` | Login | Pantalla de inicio de sesión |
| `/dashboard` | Dashboard | Panel principal con tabla de solicitudes, métricas, tabs de filtro |
| `/nueva` | NuevaSolicitud | Formulario de registro de evento (4 secciones) |
| `/estadisticas` | EstadisticasView | Panel de analíticas con sub-pestañas (Logístico, Satisfacción) |
| `/calendario` | CalendarioView | Vista de calendario con FullCalendar |
| `/evaluar/:id` | Evaluar | Evaluación de solicitud (aprobar/rechazar con detección de conflictos) |
| `/solicitudes/cancelar` | CancelarSolicitudView | Vista para que usuarios cancelen sus solicitudes |

### Estructura de Componentes
- `App.tsx` — Layout principal con navbar, routing interno, campana de notificaciones
- `ErrorBoundary.tsx` — Captura de errores en UI
- `NotificationBell.tsx` — Campana con badge y dropdown de notificaciones
- `SolicitudCompletaModal.tsx` — Modal de solo lectura con todos los datos de la solicitud
- `SatisfaccionCalidad.tsx` — Visualización de satisfacción con estrellas
- `LogoTigreTrack.tsx` — Componente SVG del logo

---

## Integraciones Externas

### Google Calendar API v3
- **Service Account** institucional para autenticación
- **Creación de evento:** Al aprobar solicitud → evento en calendario con nombre, fecha, hora, ubicación, responsable
- **Eliminación de evento:** Al cancelar solicitud → elimina del calendario
- **IDs almacenados:** `googleEventId` + `googleEventLink` en SolicitudEvento

### Nodemailer (Correos Electrónicos)
- Plantillas HTML premium con branding TigreTrack
- Tipos de correo:
  - Alerta de nueva solicitud (para ADMIN)
  - Confirmación de aprobación (para solicitante)
  - Notificación de cancelación (para solicitante)
  - Alerta de cancelación tardía (para ADMIN)
  - Notificación de modificación (para ADMIN/solicitante)

---

## Tipos de Diagramas a Generar

### 1. Diagrama Entidad-Relación (DER)
- Notación: Crow's Foot o UML
- Entidades, atributos, relaciones, cardinalidades
- Incluir todas las tablas con sus campos y tipos
- Marcar PKs y FKs explícitamente

### 2. Diagrama de Estados (State Machine)
- Estados: Pendiente → Aprobado → Completada | Pendiente → Cancelada | Aprobado → Cancelada
- Transiciones con condiciones y eventos disparadores
- Incluir acciones asociadas a cada transición (email, Google Calendar, notificación, auditoría)

### 3. Diagrama de Flujo — Creación de Solicitud
- Desde que el usuario llena el formulario hasta que recibe confirmación
- Incluir validaciones, deducción de plantel/institución, creación en BD, envío de email y notificación

### 4. Diagrama de Flujo — Aprobación con Detección de Conflictos
- Desde que el ADMIN aprueba hasta la creación del evento en Google Calendar
- Incluir la validación de conflictos horarios y el flujo de "forzar"

### 5. Diagrama de Flujo — Cancelación con Regla de 48 Horas
- Desde que el usuario solicita cancelar hasta la auditoría
- Incluir el cálculo de cancelación tardía, bifurcación de correos, eliminación de Google Calendar

### 6. Diagrama de Flujo — Autenticación y Control de Acceso
- Login, generación de JWT, middleware de autenticación
- Separación de visibilidad: ADMIN ve todo, USER ve solo sus solicitudes

### 7. Diagrama de Arquitectura del Sistema
- Capas: Frontend (React) → API (Express) → Servicios → Prisma ORM → PostgreSQL
- Servicios externos: Google Calendar API, Nodemailer
- Componentes del frontend y sus relaciones

### 8. Diagrama de Secuencia — Encuesta de Satisfacción
- Desde que el usuario accede al enlace hasta el registro en BD
- Incluir validación de solicitudId, creación del registro

---

## Formato de Salida

Genera los diagramas usando **Mermaid.js** (bloques de código ` ```mermaid `) para que sean renderizables en Markdown. Cada diagrama debe:

1. Tener un título descriptivo
2. Incluir todos los elementos relevantes del contexto
3. Usar la sintaxis correcta de Mermaid
4. Ser autocontenido (no requerir referencias externas)
5. Incluir leyendas o notas cuando sea necesario

Agrupa todos los diagramas en un solo archivo Markdown con secciones claras.
