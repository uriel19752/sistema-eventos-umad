# Dashboard Design — TigreTrack

## Contexto

- **Proyecto**: TigreTrack — plataforma institucional universitaria para gestión de solicitudes de cobertura de eventos (UMAD / IMM).
- El diseño debe transmitir **profesionalismo y claridad**.
- Apariencia **corporativa y ejecutiva**, tipo SaaS administrativo.

## Paleta institucional obligatoria

| Token | Hex | Uso |
|---|---|---|
| Azul principal | `#1e3a8a` | Información general, KPI primarios |
| Rojo institucional | `#dc2626` | Indicadores negativos, alertas |
| Blanco | `#ffffff` | Tarjetas, fondos de contenido |
| Fondo | `#f8fafc` | Fondo de página |
| Texto principal | `#1e293b` | Valores, títulos |
| Texto secundario | `#64748b` | Descriptivos, subtítulos |

## Reglas visuales

- Todas las métricas deben mostrarse mediante **KPI Cards**.
- Cada KPI Card debe contener: **Icono, Título, Valor principal, Texto descriptivo**.
- `border-radius: 16px`
- Sombras suaves: `0 2px 10px rgba(0,0,0,0.04)` o `0 4px 12px rgba(0,0,0,0.08)`
- Diseño responsive.
- Priorizar accesibilidad y legibilidad.

## Gráficas

Usar preferentemente:
- Barras, líneas, circulares y tarjetas KPI.

Colores por semántica:
- **Azul `#1e3a8a`** → información general
- **Verde** → indicadores positivos
- **Rojo `#dc2626`** → indicadores negativos
- **Amarillo** → satisfacción / advertencias

## UX — Prioridades

1. Información ejecutiva rápida
2. Mínimo scroll horizontal
3. Consistencia visual
4. Responsive design
5. Diseño moderno tipo SaaS administrativo

## Evitar

- Colores aleatorios
- Diseños oscuros por defecto
- Más de cinco colores principales
- Animaciones excesivas
- Interfaces saturadas

---

Ver `references/DASHBOARD-GUIDELINES.md` para la distribución sugerida, responsive breakpoints e iconografía.
