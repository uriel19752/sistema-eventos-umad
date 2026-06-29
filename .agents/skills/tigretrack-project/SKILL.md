# TigreTrack - Contexto del Proyecto

## Descripción General
TigreTrack es una plataforma web institucional desarrollada para la Universidad Madero (UMAD) y el Instituto Mexicano Madero (IMM) para gestionar solicitudes de cobertura de eventos por parte del área de Comunicación y Marketing Digital.

El sistema permite:

- Registro de solicitudes de cobertura.
- Aprobación, cancelación y seguimiento de eventos.
- Integración con Google Calendar.
- Envío automático de correos electrónicos.
- Gestión de materiales solicitados.
- Generación opcional de encuestas de satisfacción mediante código QR.
- Métricas y dashboards administrativos.

## Stack Tecnológico

### Frontend
- React
- TypeScript
- Vite
- Axios
- Lucide React
- qrcode.react

### Backend
- Node.js
- Express
- TypeScript
- Prisma ORM
- PostgreSQL

## Arquitectura

Frontend y backend separados.

Frontend:
frontend/src

Backend:
backend/src

Backend organizado en:
- controllers/
- routes/
- services/
- middlewares/
- dto/
- config/

## Base de Datos

ORM utilizado:
Prisma

Base de datos:
PostgreSQL

Entidades principales:

- Usuario
- SolicitudEvento
- Plantel
- Institucion
- Proveedor
- MaterialSolicitado
- EncuestaSatisfaccion
- AuditoriaCancelacion
- AsignacionProveedor

## Roles del Sistema

ADMIN:
- Puede ver todas las solicitudes.
- Puede aprobar, cancelar y completar solicitudes.
- Puede acceder al dashboard administrativo.
- Puede visualizar estadísticas institucionales.

USER:
- Solo puede ver sus propias solicitudes.
- Puede registrar nuevas solicitudes.

## Colores Institucionales

La interfaz debe mantener la identidad institucional utilizando:

Azul institucional:
#1e3a8a

Rojo institucional:
#dc2626

Blanco:
#ffffff

Color de fondo recomendado:
#f8fafc

Texto principal:
#1e293b

Texto secundario:
#64748b

Todos los nuevos componentes deben respetar esta paleta.

## Guías de Diseño

- Diseño corporativo e institucional.
- Apariencia moderna y profesional.
- Bordes redondeados suaves (12px-16px).
- Sombras ligeras.
- Evitar colores saturados fuera de la paleta institucional.
- Debe ser completamente responsive.
- Priorizar experiencia de usuario para personal administrativo.

## Convenciones de Código

Frontend:
- Componentes funcionales.
- Uso de hooks.
- TypeScript estricto.
- Mantener estilos inline solo si ya existen en el módulo.
- Preferir reutilización de componentes.

Backend:
- Toda lógica compleja debe ir en services.
- Controllers ligeros.
- Manejo de errores consistente.
- Uso de DTOs cuando aplique.

## Dashboard Administrativo

Las métricas institucionales deben mostrar:

- Solicitudes por estado.
- Eventos próximos.
- Tendencias mensuales.
- Distribución por plantel.
- Encuestas de satisfacción.
- Cancelaciones tardías.
- KPIs institucionales.

Las gráficas deben verse ejecutivas y aptas para presentación universitaria.

## Restricciones

Nunca eliminar funcionalidades existentes sin confirmación explícita.

Nunca modificar el schema de Prisma sin autorización.

Nunca eliminar integraciones con Google Calendar o correos.

Antes de realizar cambios grandes, explicar el impacto.

## Objetivo General

Mantener TigreTrack como una plataforma institucional profesional, escalable y preparada para futuras mejoras analíticas.
