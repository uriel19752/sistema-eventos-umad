# TigreTrack — Sistema de Gestión de Eventos UMAD

Plataforma full-stack para la administración de solicitudes de eventos académicos,
con flujo de aprobación, croquis, notificaciones, Google Calendar, encuestas de
satisfacción (CSAT), estadísticas y recordatorios automatizados a proveedores.

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Backend | Node.js, Express, TypeScript |
| Frontend | React 18, Vite, TypeScript |
| Base de datos | PostgreSQL 14+ con Prisma ORM |
| Autenticación | JWT (HMAC-SHA256) + RBAC |
| Calendario | Google Calendar API |
| Correo | Nodemailer |
| Archivos | Multer (croquis en disco local) |

## Requisitos Previos

- Node.js 18+
- PostgreSQL 14+
- Cuenta de Google Workspace (para integración de Calendar)
- npm o pnpm

## Configuración Inicial

1. Clonar el repositorio:
   ```bash
   git clone <repo-url>
   cd sistema-eventos-umad
   ```

2. Configurar variables de entorno:
   ```bash
   cp backend/.env.example backend/.env
   # Editar backend/.env con tus credenciales
   ```
   Variables requeridas:
   - `DATABASE_URL` — conexión a PostgreSQL
   - `JWT_SECRET` — secreto para firmar tokens
   - `GOOGLE_SERVICE_ACCOUNT_PATH` — ruta al JSON de service account de Google
   - `GOOGLE_CALENDAR_ID` — ID del calendario compartido
   - `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` — servidor de correo

3. Instalar dependencias:
   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

4. Migrar base de datos:
   ```bash
   cd backend
   npx prisma generate
   npx prisma migrate dev
   ```

5. Iniciar en desarrollo:
   ```bash
   # Terminal 1 — Backend
   cd backend && npm run dev

   # Terminal 2 — Frontend
   cd frontend && npm run dev
   ```

## Estructura del Proyecto

```
sistema-eventos-umad/
├── backend/
│   ├── src/
│   │   ├── config/          # Configuración de DB, Calendar, multer
│   │   ├── controllers/     # Handlers de rutas HTTP
│   │   ├── cron/            # Jobs programados (recordatorios)
│   │   ├── dto/             # Validación con zod
│   │   ├── jobs/            # Inicializadores de cron jobs
│   │   ├── middleware/      # Auth (JWT + RBAC)
│   │   ├── routes/          # Definición de rutas Express
│   │   ├── services/        # Lógica de negocio
│   │   ├── types/           # Extensiones de tipos (Express Request)
│   │   └── server.ts        # Punto de entrada
│   ├── prisma/
│   │   └── schema.prisma    # Modelo de datos
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/      # Componentes reutilizables
│   │   ├── pages/           # Vistas principales
│   │   ├── services/        # Cliente HTTP (axios)
│   │   ├── export/          # Generación de PDFs y Excel
│   │   ├── types/           # Tipos compartidos
│   │   ├── App.tsx          # Router principal
│   │   └── main.tsx         # Punto de entrada
│   └── package.json
├── .gitignore
└── README.md
```

## Rutas API Principales

| Método | Ruta | Descripción | Acceso |
|---|---|---|---|
| POST | `/api/auth/login` | Inicio de sesión | Público |
| GET | `/api/solicitud` | Listar solicitudes | Autenticado |
| POST | `/api/solicitud` | Crear solicitud | Autenticado |
| POST | `/api/solicitud/:id/croquis` | Subir croquis | Autenticado |
| PATCH | `/api/solicitud/:id/estatus` | Cambiar estatus | Admin |
| GET | `/api/estadisticas/dashboard` | KPIs del dashboard | Autenticado |
| GET | `/api/estadisticas/exportar` | Exportar datos | Autenticado |
| GET | `/api/notificaciones` | Listar notificaciones | Autenticado |
| GET | `/api/encuesta/:token` | Responder encuesta CSAT | Público (token) |

## Comandos Útiles

```bash
# Backend
npm run dev          # Servidor con hot-reload (tsx watch)
npm run build        # Compilar TypeScript
npm start            # Iniciar en producción

# Frontend
npm run dev          # Servidor de desarrollo Vite
npm run build        # Build de producción
```

## Licencia

Proyecto interno — Universidad UMAD
