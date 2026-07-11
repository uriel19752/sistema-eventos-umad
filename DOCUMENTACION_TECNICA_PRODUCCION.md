# Documentación Técnica — TigreTrack (Producción)

> **Sistema de Gestión de Eventos Institucionales**
> UMAD / Prepa UMAD / IMM
> Versión: 1.0.0

---

## Índice

1. [Resumen del Proyecto](#1-resumen-del-proyecto)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Tecnologías Utilizadas](#3-tecnologías-utilizadas)
4. [Estructura de Carpetas](#4-estructura-de-carpetas)
5. [Variables de Entorno](#5-variables-de-entorno)
6. [Modelo de Base de Datos](#6-modelo-de-base-de-datos)
7. [API REST](#7-api-rest)
8. [Flujo de Autenticación](#8-flujo-de-autenticación)
9. [Integración con Google Calendar](#9-integración-con-google-calendar)
10. [Sistema de Correos](#10-sistema-de-correos)
11. [Gestión de Solicitudes](#11-gestión-de-solicitudes)
12. [Gestión de Proveedores](#12-gestión-de-proveedores)
13. [Encuestas y Evaluación](#13-encuestas-y-evaluación)
14. [Exportaciones PDF y Excel](#14-exportaciones-pdf-y-excel)
15. [Tareas Programadas (Cron)](#15-tareas-programadas-cron)
16. [Instalación y Configuración](#16-instalación-y-configuración)

---

## 1. Resumen del Proyecto

**TigreTrack** es una plataforma web full-stack para la gestión y seguimiento de solicitudes de cobertura de eventos institucionales. Permite a docentes y personal administrativo de la UMAD, Prepa UMAD e IMM registrar solicitudes de cobertura de marketing/logística, aprobarlas, cancelarlas con auditoría, asignar proveedores externos, y evaluar la calidad del servicio mediante encuestas de satisfacción.

### Funcionalidades principales

- **Registro de solicitudes** con formulario multi-sección (datos del área, evento, logística, materiales requeridos)
- **Panel administrativo** con tabla de solicitudes, filtros y roles (ADMIN / SOLICITANTE)
- **Flujo de estados**: Pendiente → Aprobado → Completada / Cancelada
- **Cancelaciones** con auditoría de 48h y registro en tabla de auditoría
- **Encuestas de satisfacción** con 4 criterios de calificación (1-5)
- **Notificaciones por correo** con 8 tipos de plantillas distintas
- **Invitación .ics de calendario** adjunta al correo de aprobación
- **Integración con Google Calendar** (crear, actualizar, eliminar eventos)
- **Exportación de reportes** en PDF (PDFKit + chartjs-node-canvas) y Excel (ExcelJS)
- **Código QR** para acceso público a encuesta de satisfacción
- **Tareas programadas**: recordatorios a solicitantes a 7 días y 24h, recordatorios diarios a proveedores
- **Vista de calendario** con FullCalendar
- **Estadísticas y dashboard** con gráficos Recharts
- **Módulo de proveedores** con CRUD y asignación por solicitud

---

## 2. Arquitectura del Sistema

### Diagrama de arquitectura

```
┌─────────────────────────────────────────────────────────┐
│                    Cliente (Navegador)                    │
│  React 19 + Vite 8 + React Router 7 + Recharts          │
│  @react-oauth/google (Google Login)                      │
│  FullCalendar 6 + jsPDF + qrcode.react                   │
└──────────┬──────────────────────────────────────────────┘
           │  HTTP (localhost:5173)
           │  Proxy Vite: /api → localhost:3000
           ▼
┌─────────────────────────────────────────────────────────┐
│               Servidor Express 5 (Node.js)               │
│  Puerto: 3000                                            │
│                                                          │
│  ┌────────────┐  ┌────────────┐  ┌──────────────────┐   │
│  │ authRoutes  │  │ solicitud  │  │ proveedorRoutes  │   │
│  │ /api/auth   │  │ Routes     │  │ /api/proveedores │   │
│  └────────────┘  │ /api/      │  └──────────────────┘   │
│                  │ solicitudes │                         │
│  ┌────────────┐  └────────────┘  ┌──────────────────┐   │
│  │ encuesta   │                  │ estadisticas     │   │
│  │ Routes     │  ┌────────────┐  │ Routes           │   │
│  │ /api/      │  │ calendario │  │ /api/estadisticas│   │
│  │ encuestas  │  │ Routes     │  └──────────────────┘   │
│  └────────────┘  │ /api/      │                         │
│                  │ calendario │  ┌──────────────────┐   │
│  ┌────────────┐  └────────────┘  │ reportes Routes  │   │
│  │ auditoria  │                  │ /api/reportes    │   │
│  │ Routes     │  ┌────────────┐  └──────────────────┘   │
│  │ /api/      │  │ notifica-  │                         │
│  │ auditorias │  │ ción Routes│  ┌──────────────────┐   │
│  └────────────┘  │ /api/      │  │ catálogo Routes  │   │
│                  │ notifica-  │  │ /api/catalogos   │   │
│  ┌────────────┐  │ ciones     │  └──────────────────┘   │
│  │ material   │  └────────────┘                         │
│  │ Routes     │           ┌─────────────────────┐       │
│  │ /api/      │           │ Cron Jobs (node-cron)│       │
│  │ materiales │           │ 08:00 AM diario      │       │
│  └────────────┘           │ - Recordatorio       │       │
│                           │   solicitantes       │       │
│  Middleware:              │ - Recordatorio       │       │
│  - authMiddleware         │   proveedores        │       │
│    (JWT Bearer Token)     └─────────────────────┘       │
└──────────┬──────────────────────────────────────────────┘
           │  Prisma ORM (PostgreSQL)
           ▼
┌─────────────────────────────────────────────────────────┐
│                    PostgreSQL                            │
│  9 tablas: usuarios, planteles, instituciones,          │
│  proveedores, solicitudes_eventos,                       │
│  materiales_solicitados, asignacion_proveedores,        │
│  encuestas_satisfaccion, auditoria_cancelaciones,        │
│  notificaciones                                         │
└─────────────────────────────────────────────────────────┘
```

### Flujo de datos

1. El frontend (Vite dev server en `:5173`) hace peticiones AJAX vía axios a `/api/*`
2. Vite proxy redirige a Express (`:3000`)
3. Express aplica `authMiddleware` (JWT) en rutas protegidas
4. Los controladores procesan la lógica de negocio
5. Los servicios orquestan operaciones complejas (correos, Google Calendar, etc.)
6. Prisma ORM traduce a consultas PostgreSQL
7. Las respuestas se devuelven como JSON al frontend

---

## 3. Tecnologías Utilizadas

### Backend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Node.js | 20+ | Runtime |
| Express | 5.2.1 | Framework HTTP |
| TypeScript | 6.0.3 | Lenguaje |
| Prisma | 7.8.0 | ORM / Base de datos |
| PostgreSQL | — | Base de datos relacional |
| jsonwebtoken | 9.0.3 | Autenticación JWT |
| bcrypt | 6.0.0 | Hash de contraseñas |
| nodemailer | 9.0.0 | Envío de correos |
| google-auth-library | 10.9.0 | Verificar tokens Google OAuth |
| googleapis | 173.0.0 | Google Calendar API |
| pdfkit | 0.19.1 | Generación de PDFs |
| chartjs-node-canvas | 5.0.0 | Gráficos en PDF |
| exceljs | 4.4.0 | Generación de Excel |
| node-cron | 4.5.0 | Tareas programadas |
| dotenv | 17.4.2 | Variables de entorno |
| tsx | 4.22.4 | Dev server con hot reload |

### Frontend

| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| React | 19.2.6 | UI Framework |
| Vite | 8.0.12 | Bundler / Dev server |
| TypeScript | 6.0.2 | Lenguaje |
| react-router-dom | 7.17.0 | Enrutamiento SPA |
| axios | 1.18.0 | HTTP client |
| recharts | 3.9.0 | Gráficos interactivos |
| lucide-react | 1.18.0 | Iconos |
| @react-oauth/google | 0.13.5 | Google Login |
| FullCalendar | 6.1.21 | Vista de calendario |
| jspdf | 4.2.1 | Generación de PDF cliente |
| jspdf-autotable | 5.0.8 | Tablas en PDF |
| html2canvas | 1.4.1 | Captura de pantalla a PDF |
| html2pdf.js | 0.14.0 | HTML a PDF |
| exceljs | 4.4.0 | Exportación Excel |
| qrcode.react | 4.2.0 | Códigos QR |
| @playwright/test | 1.61.1 | Tests E2E (dev) |

---

## 4. Estructura de Carpetas

```
sistema-eventos-umad/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Modelo de datos (9 modelos, 4 enums)
│   │   ├── seed.ts                # Poblado inicial de BD
│   │   ├── migrations/            # Migraciones SQL (12 archivos)
│   │   ├── seed.js/.map/.d.ts     # Compilados de seed.ts
│   │   └── prisma.config.js/.ts   # Configuración de Prisma
│   ├── src/
│   │   ├── server.ts              # Entry point (Express + routes + cron)
│   │   ├── config/
│   │   │   └── db.ts              # Conexión Prisma
│   │   ├── middleware/
│   │   │   └── auth.middleware.ts  # JWT auth (generarToken, authMiddleware)
│   │   ├── controllers/           # 12 controladores (lógica de rutas)
│   │   │   ├── auth.controller.ts
│   │   │   ├── solicitud.controller.ts
│   │   │   ├── encuesta.controller.ts
│   │   │   ├── estadisticas.controller.ts
│   │   │   ├── exportar.controller.ts
│   │   │   ├── calendario.controller.ts
│   │   │   ├── proveedor.controller.ts
│   │   │   ├── material.controller.ts
│   │   │   ├── notificacion.controller.ts
│   │   │   ├── auditoria.controller.ts
│   │   │   ├── reportes.controller.ts
│   │   │   └── catalogo.controller.ts
│   │   ├── routes/                # 11 archivos de rutas
│   │   ├── services/              # 9 servicios (lógica de negocio)
│   │   │   ├── auth.service.ts
│   │   │   ├── solicitud.service.ts
│   │   │   ├── mailService.ts     # 8 funciones de envío de correo
│   │   │   ├── googleCalendar.service.ts
│   │   │   ├── googleCalendarEvent.service.ts
│   │   │   ├── estadisticas.service.ts
│   │   │   ├── notificacion.service.ts
│   │   │   ├── proveedor.service.ts
│   │   │   └── reminder.service.ts
│   │   ├── dto/                   # Data Transfer Objects
│   │   ├── types/                 # Tipos TypeScript
│   │   ├── cron/                  # Tareas programadas
│   │   │   └── proveedorReminder.cron.ts
│   │   ├── jobs/                  # Jobs
│   │   │   └── reminder.job.ts
│   │   └── generated/prisma/      # Cliente Prisma generado (ignorado)
│   ├── credentials/               # Service account JSON (ignorado)
│   ├── .env.example
│   ├── .gitignore
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── public/
│   │   ├── favicon.svg
│   │   └── icons.svg
│   ├── src/
│   │   ├── main.tsx               # Entry point (React + GoogleOAuthProvider)
│   │   ├── App.tsx                # Enrutamiento + layout principal
│   │   ├── App.css / index.css    # Estilos globales
│   │   ├── components/            # Componentes reutilizables
│   │   │   ├── SolicitudCompletaModal.tsx
│   │   │   ├── NotificationBell.tsx
│   │   │   ├── ErrorBoundary.tsx
│   │   │   └── SatisfaccionCalidad.tsx
│   │   ├── pages/                 # 8 páginas
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Login.tsx
│   │   │   ├── NuevaSolicitud.tsx
│   │   │   ├── Evaluar.tsx
│   │   │   ├── CancelarSolicitudView.tsx
│   │   │   ├── EstadisticasView.tsx
│   │   │   ├── CalendarioView.tsx
│   │   │   └── Proveedores.tsx
│   │   ├── assets/                # Imágenes, logos
│   │   ├── export/                # Exportaciones PDF/Excel (cliente)
│   │   │   ├── pdf/               # jsPDF + jspdf-autotable
│   │   │   └── excel/
│   │   ├── theme/colors.ts        # Paleta de colores
│   │   └── utils/statusColors.ts  # Colores por estado
│   ├── .env
│   ├── .gitignore
│   ├── index.html
│   ├── vite.config.ts
│   ├── package.json
│   ├── tsconfig.json / .app / .node
│   └── eslint.config.js
│
├── .gitignore
├── .env.example                   # Template de variables de entorno
├── DOCUMENTACION_TECNICA_PRODUCCION.md  # Este archivo
```

---

## 5. Variables de Entorno

Ver archivo `.env.example` en la raíz del repositorio.

| Variable | Requerida | Descripción |
|----------|-----------|-------------|
| `PORT` | No (default 3000) | Puerto del servidor Express |
| `DATABASE_URL` | **Sí** | Cadena de conexión PostgreSQL |
| `JWT_SECRET` | **Sí** | Secreto para firmar tokens JWT |
| `MAIL_USER` | **Sí** | Usuario SMTP (Gmail) |
| `MAIL_PASS` | **Sí** | Contraseña de aplicación Gmail |
| `FRONTEND_URL` | **Sí** | URL base para enlaces en correos |
| `GOOGLE_CLIENT_ID` | **Sí** | Client ID de Google OAuth |
| `GOOGLE_CALENDAR_ID` | **Sí** | ID del calendario Google |
| `GOOGLE_SERVICE_ACCOUNT_PATH` | **Sí** | Ruta al JSON de service account |
| `VITE_GOOGLE_CLIENT_ID` | **Sí** | Client ID para frontend (en `frontend/.env`) |

---

## 6. Modelo de Base de Datos

### Diagrama entidad-relación (textual)

```
usuarios 1──N solicitudes_eventos
planteles 1──N solicitudes_eventos
instituciones 1──N solicitudes_eventos

solicitudes_eventos 1──N materiales_solicitados
solicitudes_eventos 1──N asignacion_proveedores
solicitudes_eventos 1──N encuestas_satisfaccion
solicitudes_eventos 1──N auditoria_cancelaciones
solicitudes_eventos N──1 usuarios (creador)

proveedores 1──N asignacion_proveedores

usuarios 1──N notificaciones
```

### Modelos (9 tablas)

**Usuario** (`usuarios`)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | Int (PK) | Auto-increment |
| nombre | String? | Nombre completo |
| email | String (unique) | Correo electrónico |
| password | String? | Hash bcrypt |
| googleId | String? (unique) | ID de Google OAuth |
| rol | Rol enum | ADMIN / SOLICITANTE / USER |
| activo | Boolean | default true |
| createdAt | DateTime | Timestamp |

**SolicitudEvento** (`solicitudes_eventos`) — tabla central
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | Int (PK) | Auto-increment |
| folio | String | Folio único |
| nombreEvento | String | Nombre del evento |
| descripcion | Text? | Descripción |
| objetivoCobertura | Text? | Objetivo de cobertura |
| publicoObjetivo | Text? | Público objetivo |
| autoridadesAsistentes | Text? | Autoridades |
| plantelId | Int? (FK) | → planteles.id |
| institucionId | Int? (FK) | → instituciones.id |
| lugarEspecifico | String? | Lugar del evento |
| ubicacion | String? | Ubicación |
| fechaEvento | Date | Fecha |
| horaInicio | Time | Hora inicio |
| horaFin | Time | Hora fin |
| horaMontaje | Time? | Hora montaje |
| fechaSolicitud | DateTime | Fecha de registro |
| responsableNombre | String | Responsable |
| contacto | String? | Contacto |
| departamentoSolicitante | String? | Departamento |
| institucionPersonalizada | String? | Institución custom |
| datosEspecificos | Json? | Datos logísticos |
| croquisUrl | String? | URL de croquis |
| observaciones | Text? | Observaciones |
| prioridad | Prioridad enum | Alta / Media / Baja |
| estado | Estado enum | Pendiente / Aprobado / Completada / Cancelada |
| googleEventId | String? | ID del evento en Google Calendar |
| googleEventLink | String? | Link del evento en Google Calendar |
| recordatorio7DiasEnviado | Boolean | Flag de recordatorio |
| recordatorio24HorasEnviado | Boolean | Flag de recordatorio |
| usuarioId | Int? (FK) | → usuarios.id |

**MaterialSolicitado** (`materiales_solicitados`)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | Int (PK) | Auto-increment |
| solicitudId | Int (FK) | → solicitudes_eventos.id |
| tipoMaterial | TipoMaterial enum | Fotografia / Nota_Web / Banner / Otro |
| descripcionOtro | Text? | Descripción si tipo = Otro |

**AsignacionProveedor** (`asignacion_proveedores`)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | Int (PK) | Auto-increment |
| solicitudId | Int (FK) | → solicitudes_eventos.id |
| proveedorId | Int (FK) | → proveedores.id |

**Proveedor** (`proveedores`)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | Int (PK) | Auto-increment |
| nombre | String | Nombre |
| especialidad | String? | Especialidad |
| email | String? | Correo |
| telefono | String? | Teléfono |
| activo | Boolean | default true |

**EncuestaSatisfaccion** (`encuestas_satisfaccion`)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | Int (PK) | Auto-increment |
| solicitudId | Int (FK) | → solicitudes_eventos.id |
| puntualidad | Int | 0-5 |
| calidadTecnica | Int | 0-5 |
| atencionStaff | Int | 0-5 |
| satisfaccionGral | Int | 0-5 |
| comentarios | Text? | Comentarios |
| fechaRespuesta | DateTime | Timestamp |

**AuditoriaCancelacion** (`auditoria_cancelaciones`)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | Int (PK) | Auto-increment |
| solicitudId | Int (FK) | → solicitudes_eventos.id |
| estadoAnterior | Estado enum | Estado antes de cancelar |
| fechaCancelacion | DateTime | Timestamp |
| motivo | Text? | Motivo |
| tardia | Boolean | ¿Menos de 48h de anticipación? |

**Notificacion** (`notificaciones`)
| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | Int (PK) | Auto-increment |
| usuarioId | Int (FK) | → usuarios.id |
| titulo | String | Título |
| mensaje | Text | Mensaje |
| leida | Boolean | default false |
| fechaCreacion | DateTime | Timestamp |

**Plantel** / **Institucion** — tablas catálogo simples con `id` y `nombre`.

### Enums

| Enum | Valores |
|------|---------|
| `Estado` | Pendiente, Aprobado, Completada, Cancelada |
| `Prioridad` | Alta, Media, Baja |
| `Rol` | ADMIN, SOLICITANTE, USER |
| `TipoMaterial` | Fotografia, Nota_Web, Banner, Otro |

---

## 7. API REST

### Endpoints públicos (sin autenticación)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Health check |
| GET | `/health` | Health check con DB |
| POST | `/api/auth/signup` | Registro de usuario |
| POST | `/api/auth/login` | Login con email+password |
| POST | `/api/auth/google` | Login con Google OAuth |
| GET | `/api/solicitudes/publico/:id` | Obtener nombre de evento público |
| POST | `/api/encuestas/` | Registrar encuesta de satisfacción |

### Endpoints protegidos (requieren JWT Bearer token)

#### Solicitudes (`/api/solicitudes`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Listar solicitudes (filtrable por rol) |
| GET | `/:id` | Obtener solicitud por ID |
| GET | `/:id/pdf` | Descargar PDF de solicitud |
| POST | `/` | Crear solicitud |
| PUT | `/:id` | Editar solicitud |
| PATCH | `/:id/estado` | Cambiar estado |
| POST | `/:id/asignar-proveedores` | Asignar proveedores |

#### Materiales (`/api/materiales`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/` | Agregar materiales |
| GET | `/solicitud/:solicitudId` | Obtener materiales por solicitud |

#### Encuestas (`/api/encuestas`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/global` | Resumen global de encuestas |
| GET | `/todas` | Todas las encuestas |
| GET | `/solicitud/:solicitudId` | Encuestas por solicitud |

#### Estadísticas (`/api/estadisticas`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/dashboard` | KPIs del dashboard |
| GET | `/export/pdf` | Exportar reporte PDF |
| GET | `/export/excel` | Exportar reporte Excel |

#### Reportes (`/api/reportes`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/satisfaccion/pdf` | Reporte PDF de satisfacción |
| GET | `/satisfaccion/excel` | Reporte Excel de satisfacción |

#### Calendario (`/api/calendario`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/eventos` | Eventos del calendario |

#### Notificaciones (`/api/notificaciones`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Listar notificaciones del usuario |
| PATCH | `/:id/leida` | Marcar como leída |

#### Auditoría (`/api/auditorias`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/cancelaciones` | Resumen de cancelaciones |

#### Catálogos (`/api/catalogos`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Obtener catálogos (planteles, instituciones) |

#### Proveedores (`/api/proveedores`)
| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/` | Listar proveedores |
| GET | `/:id` | Obtener proveedor |
| POST | `/` | Crear proveedor |
| PUT | `/:id` | Editar proveedor |
| DELETE | `/:id` | Desactivar proveedor |

---

## 8. Flujo de Autenticación

### Modalidades de inicio de sesión

1. **Login local** (`POST /api/auth/login`)
   - El usuario envía `{ email, password }`
   - `auth.service.ts:loginLocal()` busca el usuario por email
   - Verifica la contraseña con `bcrypt.compare()`
   - Genera un JWT con `generarToken()` (payload: `{ id, correo, rol }`, expira: 24h)
   - Devuelve `{ token, usuario }`

2. **Login con Google** (`POST /api/auth/google`)
   - El frontend obtiene un credential token de Google Identity Services
   - Lo envía al backend como `{ credential }`
   - `auth.service.ts:loginConGoogle()` verifica el token con `google-auth-library`
   - Si el email ya existe, inicia sesión; si no, crea un nuevo usuario
   - Genera el mismo JWT de 24h

3. **Registro** (`POST /api/auth/signup`)
   - Recibe `{ email, password, nombre }`
   - Hashea la contraseña con bcrypt
   - Crea el usuario en BD
   - Devuelve `{ token, usuario }`

### Middleware de autenticación

`authMiddleware` (en `auth.middleware.ts`):
- Extrae el header `Authorization: Bearer <token>`
- Verifica el JWT con `jsonwebtoken.verify()`
- Adjunta `req.usuario = { id, correo, rol }`
- Responde 401 si no hay token o es inválido
- Se aplica a nivel de router con `router.use(authMiddleware)` para proteger grupos de rutas

### Roles

| Rol | Acceso |
|-----|--------|
| `ADMIN` | Todo: CRUD solicitudes, proveedores, ver estadísticas, KPIs superiores en dashboard |
| `SOLICITANTE` | Crear solicitudes, ver sus propias solicitudes, cancelar |
| `USER` | Similar a SOLICITANTE (acceso básico) |

---

## 9. Integración con Google Calendar

### Arquitectura

```
Frontend → Backend (crear/actualizar solicitud) → googleCalendarEvent.service.ts
                                                         │
                                                         ▼
                                                  googleCalendar.service.ts (singleton)
                                                         │
                                                         ▼
                                                  Google Calendar API v3
                                                  (Service Account JWT auth)
```

### Componentes

1. **`googleCalendar.service.ts`**
   - Singleton que autentica con Google usando una Service Account (JWT)
   - Lee `GOOGLE_SERVICE_ACCOUNT_PATH` del JSON de credenciales
   - Usa `GOOGLE_CALENDAR_ID` como ID del calendario destino
   - Scope: `https://www.googleapis.com/auth/calendar`

2. **`googleCalendarEvent.service.ts`**
   - `crearEventoSolicitud(solicitud)` — Crea evento en Google Calendar al aprobar solicitud
   - `actualizarEventoSolicitud(googleEventId, solicitud)` — Actualiza evento si se modifica la solicitud
   - `eliminarEventoSolicitud(googleEventId)` — Elimina evento si se cancela la solicitud
   - `construirDescription(solicitud)` — Genera descripción enriquecida del evento

### Flujo típico

1. Admin cambia estado de solicitud a "Aprobado"
2. `solicitud.controller.ts:actualizarEstado()` llama a `crearEventoSolicitud()`
3. Se almacena `googleEventId` y `googleEventLink` en la solicitud
4. Al cancelar una solicitud aprobada, se elimina el evento de Google Calendar

---

## 10. Sistema de Correos

### Configuración

- **Provider:** Gmail SMTP via Nodemailer
- **Desde:** `"Sistema Eventos UMAD" <axelc.p6@gmail.com>`
- **Autenticación:** `MAIL_USER` + `MAIL_PASS` (contraseña de aplicación)
- **Plantilla base:** `plantillaCorreoWrapper()` — layout con branding TigreTrack (gradiente azul, footer UMAD)

### Funciones de envío (8 tipos)

| Función | Trigger | Destinatario |
|---------|---------|-------------|
| `enviarAlertaNuevaSolicitud` | Se crea una solicitud | Admins |
| `enviarCorreoConfirmacionSolicitud` | Se crea una solicitud | Solicitante |
| `enviarCorreoAprobacion` | Solicitud aprobada | Solicitante (+ .ics adjunto) |
| `enviarCorreoCancelacion` | Solicitud cancelada | Solicitante |
| `enviarCorreoModificacion` | Solicitud editada | Admin o docente según quien edite |
| `enviarCorreoRecordatorio` | Recordatorio programado | Solicitante |
| `enviarAlertaCancelacionTardia` | Cancelación < 48h | Admin de auditoría |
| `enviarNotificacionProveedor` | Asignación/cancelación/recordatorio | Proveedor externo |

### Invitación .ics

El correo de aprobación incluye un archivo `.ics` adjunto con:
- UID único por solicitud
- Fecha/hora del evento (zona horaria CST -06:00)
- Descripción enriquecida
- Ubicación
- ORGANIZER + ATTENDEE

### Enlaces en correos

- `accionesSolicitudHtml(solicitudId)` genera:
  - `Ver Solicitud Completa` → `${FRONTEND_URL}/dashboard/solicitud/${id}`
  - `Cancelar Solicitud` → `${FRONTEND_URL}/solicitudes/cancelar?id=${id}`

---

## 11. Gestión de Solicitudes

### Ciclo de vida

```
Nueva → Pendiente → Aprobado → Completada
                  → Cancelada (en cualquier estado)
```

### Estados

| Estado | Descripción |
|--------|-------------|
| Pendiente | Solicitud registrada, esperando revisión |
| Aprobado | Solicitud aprobada, evento en Google Calendar |
| Completada | Evento realizado |
| Cancelada | Solicitud cancelada (con auditoría) |

### Campos principales de una solicitud

- **Folio** — identificador único
- **Evento** — nombre, fecha, hora inicio/fin, hora montaje
- **Ubicación** — plantel, institución, lugar específico, ubicación
- **Responsable** — nombre, contacto, departamento
- **Logística** — JSON con datos específicos (estacionamiento, mantenimiento, audiovisuales)
- **Materiales** — Fotografía, nota web, banners, otro
- **Proveedores** — asignación múltiple vía tabla pivote
- **Croquis** — URL opcional
- **Integración Google Calendar** — eventId, eventLink
- **Recordatorios** — flags para 7 días y 24 horas

### Datos específicos (campo JSON `datosEspecificos`)

```json
{
  "apoyoEstacionamiento": "si" | "no",
  "necesitaMantenimiento": "si" | "no",
  "mantenimientoItems": ["Mesas", "Sillas", "Paños"],
  "cantMesas": 0,
  "cantSillas": 0,
  "cantPanos": 0,
  "gestionExternaItems": ["Servicio Eléctrico", "Carpas", "Vallas"],
  "necesitaAudiovisuales": "si" | "no",
  "audiovisualItems": ["Proyector", "Pantalla", "Micrófono", "Bocinas", "Laptop", "Otros"],
  "audiovisualesOtrosTexto": ""
}
```

---

## 12. Gestión de Proveedores

### CRUD completo

- Crear, leer, editar y desactivar proveedores (soft delete con campo `activo`)
- Campos: nombre, especialidad, email, teléfono
- Solo accesible para rol ADMIN

### Asignación a solicitudes

- Desde `SolicitudCompletaModal` se pueden asignar uno o varios proveedores
- Almacenado en tabla pivote `asignacion_proveedores`
- Al cambiar estado a "Aprobado", se notifica a los proveedores vía `enviarNotificacionProveedor('asignacion', ...)`

### Recordatorios automáticos

- Cron job diario a las 08:00 AM
- Busca solicitudes aprobadas con evento al día siguiente
- Envía recordatorio a cada proveedor asignado que tenga email

---

## 13. Encuestas y Evaluación

### Acceso público

- Cada solicitud genera un QR con URL: `${origin}/evaluar/${solicitud.id}`
- La página `Evaluar.tsx` no requiere autenticación
- Los asistentes/ responsables califican 4 criterios del 1 al 5:
  - Puntualidad
  - Calidad Técnica
  - Atención del Staff
  - Satisfacción General
- Campo opcional de comentarios

### Visualización (Admin)

- Endpoints protegidos para consultar resultados
- Vista detallada por solicitud y resumen global
- Reportes PDF y Excel específicos de satisfacción

---

## 14. Exportaciones PDF y Excel

### Frontend (lado cliente)

| Tecnología | Uso |
|------------|-----|
| jsPDF + jspdf-autotable | PDF individual de solicitud desde `SolicitudCompletaModal` |
| qrcode.react | QR embebido en el PDF |
| exceljs (cliente) | Exportación de datos desde vistas del frontend |

### Backend (lado servidor)

| Endpoint | Tecnología | Contenido |
|----------|------------|-----------|
| `GET /api/estadisticas/export/pdf` | PDFKit + chartjs-node-canvas | Reporte con KPIs, gráficos de barras/pastel, tablas por plantel/institución/mensual/detalle |
| `GET /api/estadisticas/export/excel` | ExcelJS | Multi-sheet: Dashboard, Por Plantel, Por Institución, Historial Mensual, Detalle de Solicitudes |
| `GET /api/reportes/satisfaccion/pdf` | PDFKit | Reporte de satisfacción |
| `GET /api/reportes/satisfaccion/excel` | ExcelJS | Reporte de satisfacción en Excel |
| `GET /api/solicitudes/:id/pdf` | PDFKit | PDF individual de solicitud |

### Filtros de exportación

Los endpoints de estadísticas aceptan query params: `plantel`, `institucion`, `fechaInicio`, `fechaFin`.

---

## 15. Tareas Programadas (Cron)

### Recordatorios a solicitantes (`reminder.job.ts`)

```javascript
cron.schedule("0 8 * * *", ...)  // 08:00 AM diario
```

Delega en `reminder.service.ts:procesarRecordatorios()`:
1. Busca solicitudes aprobadas con evento en 7 días (sin recordatorio enviado)
2. Envía `enviarCorreoRecordatorio` con `diasRestantes = 7`
3. Marca `recordatorio7DiasEnviado = true`
4. Busca solicitudes aprobadas con evento en 1 día (sin recordatorio enviado)
5. Envía `enviarCorreoRecordatorio` con `diasRestantes = 1`
6. Marca `recordatorio24HorasEnviado = true`

### Recordatorios a proveedores (`proveedorReminder.cron.ts`)

```javascript
cron.schedule("0 8 * * *", ...)  // 08:00 AM diario
```

`enviarRecordatoriosProveedores()`:
1. Busca solicitudes aprobadas con fecha de evento = mañana
2. Para cada una, itera sus proveedores asignados
3. Envía `enviarNotificacionProveedor('recordatorio', ...)` a cada proveedor con email

---

## 16. Instalación y Configuración

### Prerrequisitos

- Node.js 20+
- PostgreSQL 15+
- npm

### Pasos

```bash
# 1. Clonar el repositorio
git clone <repo-url>
cd sistema-eventos-umad

# 2. Configurar variables de entorno
cp backend/.env.example backend/.env
# Editar backend/.env con valores reales

# 3. Instalar dependencias del backend
cd backend
npm install

# 4. Configurar Google Service Account
# Colocar el archivo JSON en backend/credentials/
# Configurar GOOGLE_SERVICE_ACCOUNT_PATH en .env

# 5. Ejecutar migraciones de base de datos
npx prisma migrate deploy

# 6. Poblar base de datos (opcional)
npx prisma db seed

# 7. Iniciar backend
npm run dev
# Servidor en http://localhost:3000

# 8. En otra terminal, instalar frontend
cd ../frontend
npm install

# 9. Configurar frontend/.env
# VITE_GOOGLE_CLIENT_ID=<mismo que backend>

# 10. Iniciar frontend
npm run dev
# Servidor en http://localhost:5173
```

### Compilación para producción

```bash
# Backend
cd backend
npm run build    # tsc -> genera dist/

# Frontend
cd ../frontend
npm run build    # vite build -> genera dist/

# En producción, servir frontend/dist con Nginx y
# proxy reverso /api -> backend:3000
```

### Scripts disponibles

#### Backend

| Script | Comando | Descripción |
|--------|---------|-------------|
| `dev` | `tsx watch src/server.ts` | Desarrollo con hot reload |
| `build` | `tsc` | Compilar TypeScript |
| `start` | `node dist/server.js` | Producción |

#### Frontend

| Script | Comando | Descripción |
|--------|---------|-------------|
| `dev` | `vite` | Desarrollo con HMR |
| `build` | `tsc -b && vite build` | Compilar y empaquetar |
| `preview` | `vite preview` | Preview de build |
| `lint` | `eslint .` | Linting |
