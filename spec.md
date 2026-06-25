# spec.md — Módulo de Cancelaciones de Usuario y Consulta de Encuestas (Admin)

## 1. Requisitos del Sistema (Scope & Features)

### Primero: Gestión de Cancelaciones en la Vista de Usuario
* **Banner de Advertencia Permanente:** En la parte superior de la interfaz donde el usuario gestiona sus solicitudes, figurará un aviso fijo y visible con el siguiente texto:
  > ℹ️ *«Si desea cancelar alguna solicitud, favor de hacerlo con un mínimo de 48 horas de anticipación.»*
* **Flujo del Botón Cancelar (No Bloqueante):**
  * Cada renglón de solicitud del usuario tendrá un botón interactivo para **"Cancelar"**.
  * Al presionarlo, se desplegará un modal de confirmación con una advertencia clara:
    > ⚠️ *«Recuerde que las cancelaciones deben realizarse con un mínimo de 48 horas de anticipación al evento. ¿Desea continuar de todos modos?»*
  * El modal incluirá un campo de texto (`textarea`) opcional titulado: *"Motivo de la cancelación (Opcional)"*. El usuario podrá procesar la solicitud dejándolo vacío.
  * Al confirmar, el sistema ejecutará la acción de inmediato sin importar el tiempo restante para el evento.

### Segundo: Visualización Protegida en el Panel de Administración
* **Consulta Completa de Cobertura y Encuesta:** El administrador dispondrá de un botón o modal de inspección en su panel para auditar tanto el contenido completo de la solicitud de cobertura como las respuestas de la encuesta de satisfacción asociadas (si ya fue respondida).
* **Restricción de Edición (Solo Lectura):** Todos los campos de texto, inputs, selectores o calificaciones dentro de este entorno de detalle tendrán aplicadas de forma estricta las propiedades `disabled={true}` o `readOnly={true}` en React, garantizando que la información sea inmutable.

---

## 2. Impacto en el Modelo de Datos y Lógica de Negocio

La base de datos actual cuenta con las entidades necesarias, por lo que las operaciones se realizarán sobre el esquema existente:

* **Regla de las 48 Horas (Backend):**
  * Al recibir la petición de cancelación, el controlador calculará la diferencia en horas entre el momento actual (`new Date()`) y la combinación de `fechaEvento` con `horaInicio`.
  * Si la diferencia es **menor a 48 horas**, el registro en la tabla `AuditoriaCancelacion` se guardará con la bandera `tardia: true` y disparará la alerta por correo.
  * Si faltan **48 horas o más**, se almacenará con `tardia: false`.
  * El estado de la solicitud mutará de forma definitiva a `Cancelada`.

---

## 3. Contratos de la API (Endpoints a Modificar/Crear)

### Modificar Cancelación (`POST /api/solicitudes/:id/actualizar-estado`)
* **Contexto:** Adaptar el método existente `actualizarEstado` cuando el valor sea `'Cancelada'`.
* **Payload esperado:**
  ```json
  {
    "estado": "Cancelada",
    "motivo": "Texto del usuario o vacío"
  }

## 4. Control de Accesos por Cuenta Individual (Multi-usuario)
* **Autenticación Única:** Cada usuario ingresará con sus propias credenciales institucionales.
* **Segmentación de Vistas (Backend Enforcement):**
  * **Rol ADMIN:** Al consultar el listado de solicitudes, la API omitirá filtros de pertenencia, retornando el universo completo de eventos registrados en el sistema.
  * **Rol USER:** La API forzará un filtro jerárquico basado en el `usuarioId` extraído de la sesión activa, impidiendo la lectura o alteración de solicitudes ajenas.

## 5. Módulo de Inspección Avanzada de Eventos (Vistas Modales)
* **Panel de Control de Detalles:** Al seleccionar una solicitud, la cabecera mantendrá visibles de forma permanente las métricas generales (Promedio del evento, total de encuestas registradas para dicho ID y botón de cierre).
* **Acción Avanzada - Ver Contenido de Encuesta:** * Al activarse, se inyectará un modal flotante sobrepuesto (`fixed`, `inset-0`) que aislará el universo de encuestas vinculadas a la solicitud.
  * Mostrará de forma detallada e individual cada formulario de satisfacción procesado, exponiendo las estrellas de evaluación y la caja de texto con el comentario/retroalimentación.
* **Acción Avanzada - Ver Solicitud Completa:** * Desplegará un clon estructural del formulario original de registro, mapeando la totalidad de los campos en formato inmutable (`readOnly`).

## 6. Clonación Estructural de Formulario (Modo Lectura)
* **Visualización de Solicitud:** El modal de "Ver Solicitud Completa" debe replicar fielmente las 4 secciones del formulario de registro (Datos del Área, Información del Evento, Objetivo y Logística, y Material Requerido).
* **Estilo de Bloqueo:** Todos los inputs/textareas deben usar la propiedad `readOnly={true}` y un estilo visual de "deshabilitado" (fondo gris claro) para denotar que es una auditoría inmutable.

## 7. Doble Registro Horario Logístico (Evolución de Base de Datos)
* **Ampliación del Modelo SolicitudEvento:** Se integra un campo nativo real titulado `horaMontaje` de tipo `DateTime (@db.Time)` mapeado bajo la columna `hora_montaje` en PostgreSQL para registrar el tiempo de preparativos previo al evento.
* **Interfaz de Captura del Solicitante:** El formulario añade un control de hora estructurado abajo de la ubicación con una nota aclaratoria obligatoria:
  > ⚠️ *«Nota de Logística: La "Hora de Inicio/Término" superior corresponde al programa oficial del evento. Este campo es para especificar desde qué momento requiere el acceso al espacio para preparativos, decoración o pruebas técnicas.»*
* **Restricción de Integridad:** No se añadirán tablas adicionales ni se alterará el esquema relacional existente para evitar redundancias o desajustes de consistencia de datos en Prisma.

## 8. Corrección de Vínculo Relacional en Encuestas de Satisfacción
* **Alineación de Carga de Datos (Payload):** El envío del formulario de evaluación externa modificará su cuerpo de datos (`payload`) para despachar obligatoriamente el parámetro numérico entero `solicitudId` (haciendo match exacto con el esquema relacional de Prisma), solventando de forma definitiva el error de búsqueda por folio alfanumérico.

## 9. Reestructuración de Navegación del Panel de Administración
* **Página de Inicio Consolidada:** La pantalla principal del administrador hereda la tabla general de solicitudes, el banner de auditoría de 48 horas y los contadores rápidos superiores. Se accede de forma predeterminada o mediante clic en el isotipo institucional de la esquina superior izquierda.
* **Módulos de la Barra de Navegación (Navbar):** * Se elimina permanentemente el botón de texto *"Ver Dashboard"*.
  * Se incorpora el botón *"Ver Estadísticas"*, el cual renderiza una vista dedicada única y exclusiva para analíticas profundas.
  * Se mantiene el botón *"Nueva Solicitud"* para redirigir al formulario externo.

## 10. Segmentación Temporal en la Tabla de Inicio
* **Control de Tabs de Filtrado:** Se añaden pestañas interactivas sobre la tabla principal: `Todo`, `Este Mes` y `Próximos Eventos`.
* **Criterio de Match Cronológico:** La pestaña `Este Mes` realiza la discriminación de registros contrastando el mes y año actuales contra el campo `fechaEvento` (Fecha de Realización del Evento) proveniente de PostgreSQL.

## 11. Dashboard Estadístico Profundo (Módulo Independiente)
* **Contenido Avanzado de Analíticas:**
  * **Sección de Eficiencia Logística:** Tarjetas detalladas con tasa de cancelaciones tardías (menos de 48 horas de anticipación) versus cancelaciones en tiempo y forma.
  * **Módulo de Satisfacción:** Histograma/distribución de calificaciones de encuestas (1 a 5 estrellas) con su promedio global y un feed cronológico con los comentarios de texto libre unificados.

## 12. Branding Institucional y Sentido de Pertenencia

### Objetivo
Fortalecer la identidad visual institucional de TigreTrack mediante la incorporación de los logotipos oficiales de las instituciones participantes.

### Integración Visual del Formulario
* La cabecera del formulario de registro de solicitudes incorporará una franja institucional estática ubicada en la parte superior de la interfaz.
* La franja deberá mostrar de forma horizontal los logotipos oficiales de:
  * Universidad Madero (UMAD).
  * Prepa UMAD.
  * Instituto Mexicano Madero (IMM).

### Restricciones de Diseño
* Los logotipos deberán conservar sus proporciones originales.
* La distribución deberá ser responsiva, permitiendo ajuste automático mediante `flex-wrap` en dispositivos móviles.
* Los logotipos se mostrarán centrados horizontalmente y separados mediante espaciado uniforme.
* El componente deberá respetar la paleta corporativa existente basada en tonos azules, blancos y acentos institucionales.
* La franja institucional deberá integrarse visualmente con el resto del sistema sin interrumpir el flujo de captura del formulario.

### Restricciones Técnicas
* Los recursos gráficos serán almacenados localmente dentro del frontend bajo la ruta:

```text
src/assets/logos/

## 13. Integración Institucional con Google Calendar

### Objetivo
Automatizar la programación y seguimiento de eventos institucionales mediante sincronización con Google Calendar.

### Flujo de Negocio
* Cuando una solicitud cambie al estado `Aprobada`, el sistema creará automáticamente un evento en Google Calendar institucional.
* El evento deberá contener:
  * Nombre del evento.
  * Fecha del evento.
  * Hora de inicio.
  * Hora de término.
  * Ubicación.
  * Descripción general.
  * Nombre del responsable.

### Sincronización
* Cada evento generado almacenará el identificador retornado por Google Calendar (`googleEventId`).
* Si una solicitud cambia al estado `Cancelada`, el evento correspondiente será eliminado automáticamente del calendario.

### Restricciones Técnicas
* La integración se realizará mediante Google Calendar API v3.
* La autenticación se realizará utilizando una Service Account institucional.
* La comunicación con Google Calendar será exclusivamente responsabilidad del Backend.

### Criterios de Aceptación
- [ ] Un evento aprobado crea automáticamente un registro en Google Calendar.
- [ ] Una cancelación elimina el evento del calendario.
- [ ] Los errores de sincronización son registrados sin afectar la operación principal del sistema.
