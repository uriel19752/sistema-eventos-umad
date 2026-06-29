# Arquitectura de TigreTrack

## Estructura de Directorios

```
/
├── frontend/
│   └── src/
│       ├── components/       # Componentes reutilizables
│       ├── pages/            # Vistas/páginas principales
│       ├── services/         # Llamadas API
│       └── routes/           # Configuración de rutas
│
├── backend/
│   └── src/
│       ├── controllers/      # Capa de entrada HTTP (delgados)
│       ├── services/         # Lógica de negocio
│       ├── routes/           # Definición de endpoints Express
│       ├── middlewares/      # Middleware (auth, etc.)
│       ├── dto/              # Objetos de transferencia de datos
│       ├── config/           # Configuración (DB, etc.)
│       └── generated/
│           └── prisma/       # Cliente Prisma generado
│
└── .agents/
    └── skills/
        └── tigretrack/       # Contexto del proyecto
```

## Patrón de Capas

```
HTTP Request
    │
    ▼
  Controller    ← Validación básica, delegar a service
    │
    ▼
  Service       ← Lógica de negocio, orquestación
    │
    ▼
  Prisma        ← Acceso a datos (PostgreSQL)
    │
    ▼
  Base de Datos
```

### Reglas del patrón

- **Controllers**: Únicamente reciben el request, llaman al service y devuelven la respuesta. No contienen lógica de negocio.
- **Services**: Contienen toda la lógica de negocio. Son funciones exportables que reciben datos ya validados.
- **Prisma**: Único acceso a la base de datos. No se usa SQL directo.
- **DTOs**: Definen la forma de los datos de entrada/salida en los endpoints.

## Flujo de Solicitud de Evento

```
1. Frontend (NuevaSolicitud.tsx)
   │  POST /api/solicitudes  { folio, nombreEvento, lugar, ubicacion, ... }
   ▼
2. Controller (solicitud.controller.ts)
   │  Extrae req.body, construye DTO, llama a crearSolicitud()
   ▼
3. Service (solicitud.service.ts)
   │  Valida datos, mapea ubicación a plantel/institucion,
   │  crea solicitud + materiales en transacción, envía correo
   ▼
4. Prisma → PostgreSQL
```

## Flujo de Actualización de Estado

```
1. Frontend (Dashboard.tsx)
   │  PATCH /api/solicitudes/:id/estado  { estado, motivo?, forzar? }
   ▼
2. Controller
   ▼
3. Service (actualizarEstado)
   │
   ├── Si estado === "Aprobado":
   │   ├── Detección de conflictos (misma fecha/plantel)
   │   ├── Actualiza estado en DB
   │   ├── Crea evento en Google Calendar
   │   └── Envía correo de aprobación
   │
   ├── Si estado === "Cancelada":
   │   ├── Auditoría de cancelación (tardía/en tiempo)
   │   ├── Elimina evento de Google Calendar
   │   ├── Envía correo de cancelación
   │   └── Alerta si es tardía
   │
   └── Otros estados:
       └── Solo actualiza en DB
```

## Endpoints API

### Solicitudes (`/api/solicitudes`)
| Método | Ruta | Controlador |
|---|---|---|
| GET | `/` | `obtenerSolicitudes` |
| GET | `/:id` | `obtenerSolicitudPorId` |
| POST | `/` | `crearSolicitud` |
| PATCH | `/:id/estado` | `actualizarEstado` |

### Encuestas (`/api/encuestas`)
| Método | Ruta | Controlador |
|---|---|---|
| POST | `/` | `registrarEncuesta` |
| GET | `/global` | `obtenerResumenGlobal` |
| GET | `/todas` | `obtenerTodasEncuestas` |
| GET | `/solicitud/:solicitudId` | `obtenerEncuestasPorEvento` |

### Auditorías (`/api/auditorias`)
| Método | Ruta | Controlador |
|---|---|---|
| GET | `/cancelaciones` | `obtenerResumenCancelaciones` |

### Materiales (`/api/materiales`)
| Método | Ruta | Controlador |
|---|---|---|
| POST | `/` | `agregarMateriales` |
| GET | `/solicitud/:solicitudId` | `obtenerMaterialesPorSolicitud` |

### Catálogos (`/api/catalogos`)
| Método | Ruta | Controlador |
|---|---|---|
| GET | `/` | `obtenerCatalogos` |

### Calendario (`/api/calendario`)
| Método | Ruta | Controlador |
|---|---|---|
| GET | `/eventos` | `obtenerEventosCalendario` |

### Auth (`/api/auth`)
| Método | Ruta | Controlador |
|---|---|---|
| POST | `/login` | `login` |
