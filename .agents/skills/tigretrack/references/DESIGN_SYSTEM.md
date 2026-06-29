# Sistema de Diseño — TigreTrack

## Paleta de Colores Institucionales

| Token | Color | Hex | Uso |
|---|---|---|---|
| Primary | Azul institucional | `#1e3a8a` | Encabezados, botones principales, acentos |
| Secondary | Rojo institucional | `#dc2626` | Acciones destructivas, alertas, cancelación |
| Background | Fondo claro | `#f8fafc` | Fondo de página principal |
| Surface | Blanco | `#ffffff` | Tarjetas, modales, inputs |
| TextPrimary | Texto principal | `#1e293b` | Títulos, contenido principal |
| TextSecondary | Texto secundario | `#64748b` | Subtítulos, descripciones, placeholders |
| Accent | Ámbar | `#f59e0b` | Advertencias, badges, estrellas de encuestas |
| Border | Borde suave | `#e2e8f0` | Bordes de tarjetas y contenedores |
| SurfaceAlt | Fondo alterno | `#f1f5f9` | Inputs readonly, fondos de sección |

## Componentes Visuales

### Tarjetas (Cards)
- `border-radius: 12px — 16px`
- `box-shadow: 0 1px 4px rgba(0,0,0,0.04)` (sombra ligera)
- `border: 1px solid #e2e8f0`
- Padding interno: `1.25rem`
- Fondo: `#ffffff`

### Botones
- Primario: Fondo `#1e3a8a`, texto blanco
- Secundario: Fondo `#f1f5f9`, texto `#1e293b`
- Peligro: Fondo `#dc2626`, texto blanco
- `border-radius: 6px — 8px`
- Padding: `0.5rem — 0.8rem` vertical, `1rem — 1.2rem` horizontal

### Inputs y Formularios
- `border: 1px solid #cbd5e1`
- `border-radius: 6px`
- Padding: `0.5rem`
- Fondo readonly: `#f1f5f9`
- `font-size: 0.85rem`

### Modales
- Fondo overlay: `rgba(0,0,0,0.5)` con `backdrop-filter: blur(3px)`
- `border-radius: 16px`
- Sombra: `0 10px 25px rgba(0,0,0,0.15)`
- Ancho máximo: `90vh` de alto, `95%` de ancho (max `900px`)

### Tipografía
- `font-size` base: `0.9rem`
- H3 / Títulos de sección: `1.1rem — 1.3rem`, `font-weight: 700`
- Labels: `0.8rem`, `font-weight: 600`, color `#64748b`

### Grillas
- `display: grid; grid-template-columns: repeat(auto-fit, minmax(200px|250px, 1fr)); gap: 1rem — 1.5rem`
- Uso en formularios y paneles de detalle

## Responsive

- Las tarjetas y grillas usan `auto-fit` para adaptarse al ancho disponible.
- Modales tienen `max-width: 900px; width: 95%`.
- No se utilizan media queries explícitas; el diseño se basa en `auto-fit` y porcentajes.

## Íconos

- Usar `lucide-react` para todos los íconos.
- Tamaño común: `16px — 20px`.

## Estructura de Página

- Fondo: `#f8fafc`
- Contenido en tarjetas blancas con espaciado `1.5rem` entre secciones.
- Títulos de sección con borde inferior `2px solid #1e3a8a` y `padding-bottom: 0.5rem`.

## Estilos en Línea

El proyecto actualmente usa estilos en línea en todos los componentes. Mantener esta convención para consistencia. No migrar a CSS modules o styled-components sin autorización.
