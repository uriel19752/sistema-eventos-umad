# Documentación Técnica — TigreTrack

> **Sistema de Gestión de Eventos Institucionales UMAD / Prepa UMAD / IMM**
> Versión: 1.0.0

---

## Índice

1. [Resumen del Proyecto](#1-resumen-del-proyecto)
2. [Arquitectura del Sistema](#2-arquitectura-del-sistema)
3. [Base de Datos](#3-base-de-datos)
4. [API REST](#4-api-rest)
5. [Frontend](#5-frontend)
6. [Instalación y Configuración](#6-instalación-y-configuración)
7. [Manual Técnico](#7-manual-técnico)

---

## 1. Resumen del Proyecto

**TigreTrack** es una plataforma web para la gestión y seguimiento de solicitudes de cobertura de eventos institucionales. Permite a docentes y personal administrativo de la UMAD, Prepa UMAD e IMM registrar, aprobar, cancelar y dar seguimiento a eventos, así como evaluar la calidad del servicio mediante encuestas de satisfacción.

### Funcionalidades principales

- **Registro de solicitudes** con formulario de 4 secciones (datos del área, información del evento, objetivo/logística, material requerido)
- **Panel administrativo** con tabla de solicitudes, filtros por institución/estado/plantel/periodo
- **Flujo de estados**: Pendiente → Aprobado → Completada / Cancelada
- **Cancelaciones** con auditoría de 48 horas y registro en tabla de auditoría
- **Encuestas de satisfacción** (4 criterios del 1 al 5) con comentarios
- **Notificaciones** en tiempo real vía campana en navbar
- **Recordatorios automáticos** por correo (7 días y 24 horas antes del evento)
- **Google Calendar** — creación automática de eventos al aprobar, eliminación al cancelar
- **Dashboard estadístico** con gráficas de solicitudes por mes, estado, plantel, institución, materiales
- **Reportes exportables** en PDF y Excel con gráficos incrustados
- **Calendario interactivo** con FullCalendar
- **Identidad visual institucional** con logos de UMAD, Prepa UMAD e IMM

---

## 2. Arquitectura del Sistema

### 2.1 Stack Tecnológico

| Capa        | Tecnología                                  |
|-------------|---------------------------------------------|
| Frontend    | React 19, TypeScript, Vite 8                |
| Backend     | Express 5, TypeScript 6                     |
| ORM         | Prisma 7 (con @prisma/adapter-pg)           |
| Base de Datos | PostgreSQL                                |
| Autenticación | JWT (jsonwebtoken)                        |
| Estilos     | CSS-in-JS (objetos React), Lucide icons     |
| Calendario  | FullCalendar 6, Google Calendar API v3      |
| Gráficos    | Recharts, Chart.js (chartjs-node-canvas)    |
| Reportes    | PDFKit, ExcelJS                             |
| Correo      | Nodemailer (Gmail SMTP)                     |
| Tareas CRON | node-cron                                   |
| Código QR   | qrcode.react                                |

### 2.2 Patrón de Arquitectura

El backend sigue un patrón de **capas** estricto:

```
┌──────────────────────────────────────┐
│           Routes                     │
│  (definen endpoints → controladores) │
└──────────────┬───────────────────────┘
               ▼
┌──────────────────────────────────────┐
│         Controllers                  │
│  • Reciben Request/Response Express  │
│  • Extraen/validan datos del request │
│  • Invocan servicios                 │
│  • Retornan respuestas HTTP          │
└──────────────┬───────────────────────┘
               ▼
┌──────────────────────────────────────┐
│           Services                   │
│  • Lógica de negocio                 │
│  • Operan sobre Prisma, APIs, etc.   │
│  • Lanzan errores con statusCode     │
│  • No conocen Request/Response       │
└──────┬──────────────┬───────────────┘
       ▼              ▼
┌──────────────┐ ┌──────────────┐
│   Prisma     │ │  MailService │
│   (DB)       │ │  (Nodemailer)│
└──────────────┘ └──────────────┘
       ▼              ▼
┌──────────────┐ ┌──────────────┐
│Google        │ │  Notificacion│
│Calendar API  │ │  Service     │
└──────────────┘ └──────────────┘
```

### 2.3 Estructura de Directorios

```
sistema-eventos-umad/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma          # Modelo de datos
│   │   ├── migrations/            # Migraciones SQL
│   │   └── seed.ts                # Seed de datos
│   ├── src/
│   │   ├── server.ts              # Entry point (Express app)
│   │   ├── config/
│   │   │   └── db.ts              # Cliente singleton Prisma
│   │   ├── routes/                # 10 archivos de rutas
│   │   ├── controllers/           # 10 controladores
│   │   ├── services/              # 7 servicios
│   │   ├── middleware/
│   │   │   └── auth.middleware.ts  # JWT middleware
│   │   ├── dto/                   # 3 DTOs
│   │   ├── types/                 # Tipos TS
│   │   ├── jobs/
│   │   │   └── reminder.job.ts    # CRON recordatorios
│   │   └── generated/prisma/      # Prisma Client generado
│   ├── credentials/               # Google Service Account JSON
│   ├── docs/                      # Documentación adicional
│   ├── .env                       # Variables de entorno
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── App.tsx                # Router + layout principal
│   │   ├── main.tsx               # Entry point React
│   │   ├── pages/                 # 7 vistas (páginas)
│   │   ├── components/            # 4 componentes
│   │   ├── assets/logos/          # Logotipos institucionales
│   │   ├── theme/
│   │   │   └── colors.ts          # Paleta de colores
│   │   └── utils/
│   │       └── statusColors.ts    # Colores por estado
│   ├── vite.config.ts             # Proxy /api → backend
│   └── package.json
│
├── spec.md                        # Especificación funcional
└── DOCUMENTACION_TECNICA.md       # Este documento
```

---

## 3. Base de Datos

### 3.1 Esquema Relacional

El sistema utiliza **PostgreSQL** con **8 modelos** orquestados por Prisma ORM.

#### 3.1.1 Enumeraciones

| Enum          | Valores                                     |
|---------------|---------------------------------------------|
| `Prioridad`   | `Alta`, `Media`, `Baja`                     |
| `Estado`      | `Pendiente`, `Aprobado`, `Completada`, `Cancelada` |
| `Rol`         | `ADMIN`, `USER`                             |
| `TipoMaterial`| `Fotografia`, `Nota_Web`, `Banner`, `Otro`  |

#### 3.1.2 Modelos

**Usuario** (`usuarios`)

| Columna   | Tipo         | Restricciones        |
|-----------|--------------|----------------------|
| id        | Int          | PK, autoincrement    |
| correo    | VarChar(255) | UNIQUE, NOT NULL     |
| password  | VarChar(255) | NOT NULL (bcrypt)    |
| rol       | Rol          | DEFAULT 'USER'       |

**Plantel** (`planteles`)

| Columna | Tipo         | Restricciones     |
|---------|--------------|-------------------|
| id      | Int          | PK, autoincrement |
| nombre  | VarChar(255) | NOT NULL          |

**Institucion** (`instituciones`)

| Columna | Tipo         | Restricciones     |
|---------|--------------|-------------------|
| id      | Int          | PK, autoincrement |
| nombre  | VarChar(255) | NOT NULL          |

**SolicitudEvento** (`solicitudes_eventos`) — tabla principal

| Columna                    | Tipo         | Restricciones                    |
|----------------------------|--------------|----------------------------------|
| id                         | Int          | PK, autoincrement                |
| folio                      | VarChar(50)  | NOT NULL                         |
| nombreEvento               | VarChar(255) | NOT NULL                         |
| descripcion                | Text?        |                                  |
| objetivoCobertura          | Text?        |                                  |
| publicoObjetivo            | Text?        |                                  |
| autoridadesAsistentes      | Text?        |                                  |
| plantelId                  | Int?         | FK → planteles.id                |
| institucionId              | Int?         | FK → instituciones.id            |
| lugarEspecifico            | VarChar(255)?|                                  |
| ubicacion                  | VarChar(255)?|                                  |
| fechaEvento                | Date         | NOT NULL                         |
| horaInicio                 | Time         | NOT NULL                         |
| horaFin                    | Time         | NOT NULL                         |
| horaMontaje                | Time?        |                                  |
| fechaSolicitud             | Timestamp    | DEFAULT now()                    |
| responsableNombre          | VarChar(255) | NOT NULL                         |
| contacto                   | VarChar(255)?|                                  |
| departamentoSolicitante    | VarChar(255)?|                                  |
| institucionPersonalizada   | VarChar(255)?|                                  |
| datosEspecificos           | Json?        |                                  |
| croquisUrl                 | VarChar(500)?|                                  |
| observaciones              | Text?        |                                  |
| prioridad                  | Prioridad    | DEFAULT 'Media'                  |
| estado                     | Estado       | DEFAULT 'Pendiente'              |
| googleEventId              | VarChar(255)?| ID del evento en Google Calendar |
| googleEventLink            | VarChar(500)?| Enlace al evento en Google Calendar|
| recordatorio7DiasEnviado   | Boolean      | DEFAULT false                    |
| recordatorio24HorasEnviado | Boolean      | DEFAULT false                    |
| usuarioId                  | Int?         | FK → usuarios.id                 |

**MaterialSolicitado** (`materiales_solicitados`)

| Columna        | Tipo         | Restricciones                     |
|----------------|--------------|-----------------------------------|
| id             | Int          | PK, autoincrement                 |
| solicitudId    | Int          | FK → solicitudes_eventos.id (CASCADE) |
| tipoMaterial   | TipoMaterial | NOT NULL                          |
| descripcionOtro| Text?        |                                   |

**AsignacionProveedor** (`asignacion_proveedores`)

| Columna     | Tipo | Restricciones                             |
|-------------|------|-------------------------------------------|
| id          | Int  | PK, autoincrement                         |
| solicitudId | Int  | FK → solicitudes_eventos.id (CASCADE)     |
| proveedorId | Int  | FK → proveedores.id                       |

**Proveedor** (`proveedores`)

| Columna      | Tipo         | Restricciones     |
|--------------|--------------|-------------------|
| id           | Int          | PK, autoincrement |
| nombre       | VarChar(255) | NOT NULL          |
| especialidad | VarChar(255)?|                   |
| email        | VarChar(255)?|                   |
| telefono     | VarChar(50)? |                   |
| activo       | Boolean      | DEFAULT true      |

**EncuestaSatisfaccion** (`encuestas_satisfaccion`)

| Columna        | Tipo      | Restricciones                         |
|----------------|-----------|---------------------------------------|
| id             | Int       | PK, autoincrement                     |
| solicitudId    | Int       | FK → solicitudes_eventos.id (CASCADE) |
| puntualidad    | Int       | DEFAULT 0 (1-5)                       |
| calidadTecnica | Int       | DEFAULT 0 (1-5)                       |
| atencionStaff  | Int       | DEFAULT 0 (1-5)                       |
| satisfaccionGral| Int      | DEFAULT 0 (1-5)                       |
| comentarios    | Text?     |                                       |
| fechaRespuesta | Timestamp | DEFAULT now()                          |

**AuditoriaCancelacion** (`auditoria_cancelaciones`)

| Columna          | Tipo      | Restricciones                         |
|------------------|-----------|---------------------------------------|
| id               | Int       | PK, autoincrement                     |
| solicitudId      | Int       | FK → solicitudes_eventos.id (CASCADE) |
| estadoAnterior   | Estado    | NOT NULL                              |
| fechaCancelacion | Timestamp | DEFAULT now()                          |
| motivo           | Text?     |                                       |
| tardia           | Boolean   | DEFAULT false                         |

**Notificacion** (`notificaciones`)

| Columna       | Tipo         | Restricciones                     |
|---------------|--------------|-----------------------------------|
| id            | Int          | PK, autoincrement                 |
| usuarioId     | Int          | FK → usuarios.id (CASCADE)        |
| titulo        | VarChar(255) | NOT NULL                          |
| mensaje       | Text         | NOT NULL                          |
| leida         | Boolean      | DEFAULT false                     |
| fechaCreacion | Timestamp    | DEFAULT now()                     |

### 3.2 Relaciones Clave

```
Usuario 1──N SolicitudEvento
Plantel 1──N SolicitudEvento
Institucion 1──N SolicitudEvento
SolicitudEvento 1──N MaterialSolicitado
SolicitudEvento 1──N AsignacionProveedor
Proveedor 1──N AsignacionProveedor
SolicitudEvento 1──N EncuestaSatisfaccion
SolicitudEvento 1──N AuditoriaCancelacion
Usuario 1──N Notificacion
```

### 3.3 Migraciones

Las migraciones se encuentran en `backend/prisma/migrations/`. Se ejecutan con:

```bash
npx prisma migrate dev          # Desarrollo: aplica + genera nombre
npx prisma migrate deploy       # Producción: solo aplica pendientes
```

### 3.4 Seed

El archivo `backend/prisma/seed.ts` inserta datos iniciales (usuarios, planteles, instituciones, proveedores). Se ejecuta con:

```bash
npx prisma db seed
```

---

## 4. API REST

### 4.1 Autenticación

Todas las rutas (excepto login y público) requieren el header:

```
Authorization: Bearer <token_jwt>
```

El token se obtiene de `POST /api/auth/login` y expira en **24 horas**.

### 4.2 Endpoints

#### Auth

| Método | Ruta              | Auth | Descripción               |
|--------|--------------------|------|---------------------------|
| POST   | `/api/auth/login`  | No   | Iniciar sesión            |

- **POST /api/auth/login**
  ```json
  // Request
  { "correo": "user@umad.edu.mx", "password": "123456" }
  // Response 200
  { "id": 1, "correo": "user@umad.edu.mx", "rol": "USER", "token": "eyJ..." }
  ```

#### Solicitudes

| Método | Ruta                                      | Auth  | Rol     | Descripción                     |
|--------|-------------------------------------------|-------|---------|---------------------------------|
| GET    | `/api/solicitudes`                        | Sí    | Cualquier | Listar solicitudes (USER ve solo sus, ADMIN ve todas) |
| GET    | `/api/solicitudes/:id`                    | Sí    | Cualquier | Obtener solicitud por ID       |
| POST   | `/api/solicitudes`                        | Sí    | Cualquier | Crear nueva solicitud           |
| PUT    | `/api/solicitudes/:id`                    | Sí    | Cualquier | Editar solicitud                |
| PATCH  | `/api/solicitudes/:id/estado`             | Sí    | Cualquier | Actualizar estado               |
| GET    | `/api/solicitudes/publico/:id`            | No    | -       | Obtener nombre del evento público |

- **POST /api/solicitudes**
  ```json
  // Request (parcial)
  {
    "folio": "EVT-1719000000000",
    "nombreEvento": "Feria de Ciencias",
    "descripcion": "...",
    "fechaEvento": "2026-10-15",
    "horaInicio": "09:00",
    "horaFin": "13:00",
    "horaMontaje": "08:00",
    "responsableNombre": "Dr. Juan Pérez",
    "materiales": { "fotografias": true, "notaWeb": false, "banners": true, "otro": "" },
    "plantelId": 1,
    "institucionId": 1
    // ...
  }
  // Response 201
  { "id": 42, "folio": "EVT-1719000000000", "success": true, "message": "..." }
  ```

- **PATCH /api/solicitudes/:id/estado**
  ```json
  // Request
  { "estado": "Aprobado" }
  // o
  { "estado": "Cancelada", "motivo": "Razón opcional" }
  // o (forzar aprobación con conflicto horario)
  { "estado": "Aprobado", "forzar": true }
  ```

#### Materiales

| Método | Ruta                                       | Auth | Descripción                  |
|--------|---------------------------------------------|------|------------------------------|
| POST   | `/api/materiales`                           | No   | Agregar materiales a solicitud |
| GET    | `/api/materiales/solicitud/:solicitudId`    | No   | Materiales por solicitud     |

#### Encuestas

| Método | Ruta                                    | Auth | Descripción                     |
|--------|------------------------------------------|------|---------------------------------|
| POST   | `/api/encuestas`                         | No   | Registrar encuesta              |
| GET    | `/api/encuestas/global`                  | No   | Resumen global de promedios     |
| GET    | `/api/encuestas/todas`                   | No   | Listar todas las encuestas      |
| GET    | `/api/encuestas/solicitud/:solicitudId`  | No   | Encuestas por solicitud         |

- **POST /api/encuestas**
  ```json
  // Request
  {
    "solicitud_id": 42,
    "puntualidad": 5,
    "calidadTecnica": 4,
    "atencionStaff": 5,
    "satisfaccionGral": 5,
    "comentarios": "Excelente servicio"
  }
  ```

#### Estadísticas

| Método | Ruta                              | Auth | Rol    | Descripción               |
|--------|-----------------------------------|------|--------|---------------------------|
| GET    | `/api/estadisticas/dashboard`     | Sí   | ADMIN  | Dashboard completo        |
| GET    | `/api/estadisticas/export/pdf`    | Sí   | ADMIN  | Exportar PDF del dashboard |
| GET    | `/api/estadisticas/export/excel`  | Sí   | ADMIN  | Exportar Excel del dashboard |

- **GET /api/estadisticas/dashboard?plantel=Centro&institucion=UMAD**
  ```json
  // Response
  {
    "totalSolicitudes": 150,
    "pendientes": 30,
    "aprobadas": 80,
    "completadas": 25,
    "canceladas": 15,
    "porPlantel": [{"nombre": "Zavaleta", "total": 90}, ...],
    "porInstitucion": [{"nombre": "UMAD", "total": 70}, ...],
    "porMaterial": [{"tipo": "Fotografia", "total": 120}, ...],
    "porMes": [{"mes": "Ene", "total": 10}, ...],
    "tendencias": { "totalSolicitudes": 15, "pendientes": -5, ... },
    "insights": {
      "plantelLider": { "nombre": "Zavaleta", "porcentaje": 60 },
      "institucionLider": { "nombre": "UMAD", "porcentaje": 47 },
      "mesMasActivo": { "nombre": "May", "total": 25 },
      "tasaCancelacion": 10,
      "tendenciaGeneral": { "porcentaje": 15, "tipo": "crecimiento" }
    },
    "promediosEncuesta": {
      "puntualidad": 4.5, "calidadTecnica": 4.2,
      "atencionStaff": 4.7, "satisfaccionGral": 4.3,
      "totalEncuestas": 85
    },
    "diagnostico": { "nivel": "Excelente", "mensaje": "...", "color": "#16A34A" },
    "variacionCSAT": { "actual": 4.43, "anterior": 4.1, "diferencia": 0.33 },
    "distribucionEstrellas": [
      { "estrellas": 5, "total": 40 },
      { "estrellas": 4, "total": 25 },
      ...
    ]
  }
  ```

#### Catálogos

| Método | Ruta               | Auth | Descripción                        |
|--------|---------------------|------|------------------------------------|
| GET    | `/api/catalogos`    | No   | Obtener instituciones y planteles  |

#### Auditoría

| Método | Ruta                         | Auth | Descripción                    |
|--------|-------------------------------|------|--------------------------------|
| GET    | `/api/auditorias/cancelaciones` | No | Resumen de cancelaciones       |

#### Calendario

| Método | Ruta                    | Auth | Descripción                     |
|--------|-------------------------|------|---------------------------------|
| GET    | `/api/calendario/eventos` | Sí  | Eventos no cancelados           |

#### Notificaciones

| Método | Ruta                         | Auth | Descripción                   |
|--------|-------------------------------|------|-------------------------------|
| GET    | `/api/notificaciones`         | Sí   | Notificaciones del usuario    |
| PATCH  | `/api/notificaciones/:id/leida`| Sí  | Marcar como leída             |

#### Reportes

| Método | Ruta                                    | Auth | Rol    | Descripción                    |
|--------|------------------------------------------|------|--------|--------------------------------|
| GET    | `/api/reportes/satisfaccion/pdf`         | Sí   | ADMIN  | Reporte PDF de satisfacción    |
| GET    | `/api/reportes/satisfaccion/excel`       | Sí   | ADMIN  | Reporte Excel de satisfacción  |

### 4.3 Códigos de Error

| Código | Significado                      |
|--------|----------------------------------|
| 400    | Datos inválidos, validación fallida |
| 401    | Token requerido o inválido       |
| 403    | Sin permisos para la acción      |
| 404    | Recurso no encontrado            |
| 409    | Conflicto (ej. horario)          |
| 500    | Error interno del servidor       |

El formato de error es siempre:
```json
{ "error": "Mensaje descriptivo" }
```

---

## 5. Frontend

### 5.1 Vistas (Páginas)

| Ruta                   | Componente              | Descripción                                      |
|------------------------|-------------------------|--------------------------------------------------|
| `/login`               | `Login.tsx`             | Pantalla de inicio de sesión                     |
| `/dashboard`           | `Dashboard.tsx`         | Panel principal con tabla de solicitudes         |
| `/nueva`               | `NuevaSolicitud.tsx`    | Formulario de registro de solicitud (4 secciones)|
| `/estadisticas`        | `EstadisticasView.tsx`  | Dashboard estadístico avanzado                   |
| `/calendario`          | `CalendarioView.tsx`    | Calendario interactivo con FullCalendar          |
| `/evaluar/:id`         | `Evaluar.tsx`           | Encuesta de satisfacción (público)               |
| `/solicitudes/cancelar`| `CancelarSolicitudView.tsx` | Cancelación desde enlace de correo           |

### 5.2 Componentes

| Componente                  | Descripción                                    |
|-----------------------------|------------------------------------------------|
| `SolicitudCompletaModal`    | Modal de solo lectura con datos completos de la solicitud |
| `SatisfaccionCalidad`       | Tarjetas de satisfacción, CSAT, diagnóstico    |
| `NotificationBell`          | Campana de notificaciones con contador         |
| `ErrorBoundary`             | Captura de errores React                       |

### 5.3 Tema y Estilos

Paleta de colores definida en `src/theme/colors.ts`:

```typescript
export const COLORS = {
  primary:   "#1E3A8A",  // Azul Marino Institucional
  secondary: "#E11D48",  // Rojo Tigre
  accent:    "#2563EB",  // Azul tecnológico
  gold:      "#D97706",  // Dorado institucional
  background:"#F1F5F9",
  surface:   "#FFFFFF",
  // ...
}
```

### 5.4 Proxy de Desarrollo

Vite redirige las llamadas `/api` al backend:

```typescript
// vite.config.ts
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3000',
      changeOrigin: true,
    },
  },
},
```

---

## 6. Instalación y Configuración

### 6.1 Requisitos del Sistema

| Herramienta  | Versión Mínima |
|--------------|----------------|
| Node.js      | 22+            |
| npm          | 10+            |
| PostgreSQL   | 15+            |
| Git          | -              |

### 6.2 Pasos de Instalación

#### 1. Clonar el repositorio

```bash
git clone <repo-url>
cd sistema-eventos-umad
```

#### 2. Configurar Backend

```bash
cd backend
cp .env.example .env
```

Editar `.env`:

```env
# Base de datos
DATABASE_URL="postgresql://postgres:password@localhost:5432/sistema_eventos_umad?schema=public"

# Puerto del servidor
PORT=3000

# JWT
JWT_SECRET="tigretrack-secret-dev"

# Correo (Nodemailer + Gmail)
EMAIL_USER="tu_correo@gmail.com"
EMAIL_PASS="tu_contraseña_de_aplicacion"

# Google Calendar API
GOOGLE_CALENDAR_ID="tu_calendar_id@group.calendar.google.com"
GOOGLE_SERVICE_ACCOUNT_PATH="./credentials/google-service-account.json"
```

Instalar dependencias e inicializar BD:

```bash
npm install
npx prisma migrate dev
npx prisma db seed
```

#### 3. Configurar Frontend

```bash
cd ../frontend
npm install
```

#### 4. Iniciar en Desarrollo

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

El frontend corre en `http://localhost:5173` y el backend en `http://localhost:3000`.

### 6.3 Google Calendar (Configuración Adicional)

1. Ir a [Google Cloud Console](https://console.cloud.google.com)
2. Crear proyecto o seleccionar existente
3. Habilitar **Google Calendar API**
4. Crear **Service Account** y descargar JSON
5. Colocar JSON en `backend/credentials/google-service-account.json`
6. Compartir el calendario institucional con el email de la service account (rol: "Make changes to events")
7. Configurar `GOOGLE_CALENDAR_ID` y `GOOGLE_SERVICE_ACCOUNT_PATH` en `.env`

### 6.4 Correo Electrónico (Gmail)

1. Activar [2FA en la cuenta de Gmail](https://myaccount.google.com/security)
2. Generar [App Password](https://myaccount.google.com/apppasswords)
3. Configurar `EMAIL_USER` y `EMAIL_PASS` en `.env`

---

## 7. Manual Técnico

### 7.1 Comandos Útiles

#### Backend

```bash
# Desarrollo (hot-reload con tsx)
npm run dev

# Compilar a JS
npm run build

# Producción
npm start

# Migraciones
npx prisma migrate dev         # Desarrollo
npx prisma migrate deploy      # Producción

# Seed
npx prisma db seed

# Studio (UI de BD)
npx prisma studio
```

#### Frontend

```bash
npm run dev       # Desarrollo
npm run build     # Compilar producción
npm run preview   # Vista previa de build
npm run lint      # ESLint
```

### 7.2 Flujo de Negocio

```
Usuario crea solicitud → Estado: Pendiente
                             │
                    ┌────────┴────────┐
                    ▼                 ▼
              Admin Aprueba     Admin/User Cancela
                    │                 │
                    ▼                 ▼
            Estado: Aprobado    Estado: Cancelada
                    │                 │
            ┌───────┴───────┐    ┌────┴────┐
            ▼               ▼    ▼         ▼
      Google Calendar   Correo   Auditoría  Google Calendar
      (crea evento)     (aprob.) (tardía?)  (elimina evento)
            │
            ▼
      Estado: Completada (manual)

      Usuario evalúa → Encuesta de satisfacción
```

### 7.3 Regla de las 48 Horas (Cancelaciones)

Cuando se cancela una solicitud, el sistema calcula la diferencia entre `fechaEvento + horaInicio` y el momento actual:

- **< 48 horas**: Se registra como `tardia: true` en `AuditoriaCancelacion` y se envía alerta por correo.
- **>= 48 horas**: Se registra como `tardia: false`.

### 7.4 Cron Jobs

El sistema ejecuta un job diario a las **08:00 AM** que:

1. Busca solicitudes aprobadas con evento en **7 días** → envía recordatorio por correo y marca `recordatorio7DiasEnviado = true`
2. Busca solicitudes aprobadas con evento en **1 día** → envía recordatorio por correo y marca `recordatorio24HorasEnviado = true`

Además, al consultar notificaciones (`GET /api/notificaciones`) se ejecuta `generarRecordatoriosAutomatizados()` que notifica en la interfaz sobre eventos del día siguiente.

### 7.5 Servicios Externos

| Servicio         | Librería     | Configuración en .env               |
|------------------|--------------|-------------------------------------|
| Gmail SMTP       | nodemailer   | `EMAIL_USER`, `EMAIL_PASS`          |
| Google Calendar  | googleapis   | `GOOGLE_CALENDAR_ID`, `GOOGLE_SERVICE_ACCOUNT_PATH` |

Todos los servicios externos se ejecutan de forma **no bloqueante** (`.catch()`), sin afectar la respuesta HTTP.

### 7.6 Despliegue en Producción

#### Backend

```bash
cd backend
npm run build         # Compila a dist/
node dist/server.js   # O usar PM2: pm2 start dist/server.js
```

#### Frontend

```bash
cd frontend
npm run build         # Genera dist/
```

Servir `frontend/dist/` con Nginx, Apache o similar, configurando el proxy reverso para `/api` hacia el backend.

Ejemplo de configuración Nginx:

```nginx
server {
    listen 80;
    server_name tigretrack.mx;

    root /var/www/tigretrack/frontend/dist;
    index index.html;

    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 7.7 Variables de Entorno (Backend)

| Variable                      | Obligatoria | Descripción                                    |
|-------------------------------|-------------|------------------------------------------------|
| `DATABASE_URL`                | Sí          | Cadena de conexión PostgreSQL                   |
| `PORT`                        | No          | Puerto del servidor (default: 3000)            |
| `JWT_SECRET`                  | No          | Secreto JWT (default: "tigretrack-secret-dev")  |
| `EMAIL_USER`                  | Sí*         | Correo Gmail para envío de alertas             |
| `EMAIL_PASS`                  | Sí*         | App Password de Gmail                          |
| `GOOGLE_CALENDAR_ID`          | No*         | ID del calendario Google institucional         |
| `GOOGLE_SERVICE_ACCOUNT_PATH` | No*         | Ruta al JSON de service account                |
| `FRONTEND_URL`                | No          | URL del frontend (default: http://localhost:5173)|

\* Obligatoria solo si se usa la funcionalidad correspondiente.

### 7.8 Seed - Credenciales por Defecto

Los datos insertados por `npx prisma db seed` incluyen:

| Correo                  | Contraseña | Rol    |
|-------------------------|------------|--------|
| admin@umad.edu.mx       | admin123   | ADMIN  |
| docente1@umad.edu.mx    | docente123 | USER   |
| docente2@prepaumad.edu.mx| docente123| USER   |

Y los catálogos:

- **Planteles**: UMAD Campus Puebla, IMM Campus Centro, IMM Campus Zavaleta, Lugar Externo
- **Instituciones**: UMAD, Prepa UMAD, IMM, IMM Secundaria, IMM Primaria, IMM Maternal
- **Proveedores**: Fotografía Profesional, Diseño Gráfico, Logística

### 7.9 Seguridad

- Las contraseñas se almacenan hasheadas con **bcrypt**
- La autenticación usa **JWT** con expiración de 24h
- Los usuarios **USER** solo ven y modifican sus propias solicitudes (filtro por `usuarioId`)
- Los usuarios **ADMIN** ven todas las solicitudes
- Las rutas sensibles están protegidas por `authMiddleware`
- No se exponen contraseñas ni tokens en el código fuente

### 7.10 Mantenimiento

**Respaldos periódicos de PostgreSQL:**
```bash
pg_dump -U postgres -d sistema_eventos_umad > respaldo_$(date +%Y%m%d).sql
```

**Monitoreo de logs:**
- Los errores del backend se registran con `console.error`
- Los errores del servicio de correo y Google Calendar se capturan con `.catch()` sin interrumpir el flujo principal

**Actualización de dependencias:**
```bash
cd backend && npm outdated && npm update
cd frontend && npm outdated && npm update
```

---
*Documentación generada para TigreTrack v1.0.0 — Sistema de Gestión de Eventos Institucionales UMAD*
