# ESPECIFICACIÓN TÉCNICA - SISTEMA DE EVENTOS UMAD / IMM

## 1. CONTROL DE ACCESO (AUTENTICACIÓN POR ROLES)
* **Modelo Prisma:** Crear la tabla `Usuario` con: id, correo (único), password (encriptado con bcrypt) y rol (ADMIN / USER).
* **Rol Administrador (Cliente):** Único con acceso a la barra de navegación para visualizar el Dashboard, KPIs, listado de solicitudes, desglose de materiales y métricas de encuestas.
* **Rol Usuario (Solicitante):** Redirección exclusiva a la pantalla de "Nueva Solicitud". Navbar restringido sin acceso a métricas ni analíticas.

## 2. FORMULARIO EXTENDIDO (CAMPOS OFICIALES UMAD)
Campos obligatorios integrados a la tabla `Solicitud` según el formato institucional:
* **Contacto:** `area_departamento`, `responsable_evento`, `whatsapp_correo`[cite: 1].
* **Logística:** `nombre_evento`, `fecha_evento`, `horario_inicio_fin`, `lugar` (interno/externo), `publico_objetivo`, `autoridades_asisten`, `descripcion`[cite: 1].
* **Estrategia & Insumos:** `objetivo_cobertura`[cite: 1] y `materiales_requeridos` (checkboxes: Fotografías, Nota web, Banners, Otro)[cite: 1].

## 3. ENCUESTA POR QR (GENERACIÓN Y DESCARGA INMEDIATA)
* **Interrupción:** Checkbox final: "¿Desea generar encuesta de satisfacción por QR?".
* **Flujo del QR:** Si marca "Sí", tras registrar la solicitud, el sistema procesa el insert y genera un código QR que apunta a `/evaluar/:solicitudId`.
* **Descarga:** La interfaz muestra un modal de éxito con el código QR renderizado en pantalla y un botón interactivo para descargar el QR como imagen (.png) en ese mismo instante.

## 4. MAILING (NODEMAILER)
* **Eventos de Disparo (Backend):**
    * **Creación:** Correo automático al usuario con el resumen del formato de cobertura[cite: 1] y correo al administrador notificando la nueva entrada.
    * **Cancelación Tardía:** Alerta inmediata al administrador si un evento se cancela con menos de 48 horas de anticipación para activar la auditoría.
