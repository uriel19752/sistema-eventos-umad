# Dashboard Guidelines — TigreTrack

## Distribución sugerida del layout

```
┌─────────────────────────────────────────────────────────────────────┐
│  Fila 1 — KPIs (5 columnas desktop, 2 tablet, 1 móvil)            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │  Total   │ │Pendientes│ │Aprobadas │ │Completa- │ │Canceladas│ │
│  │ Solicitud│ │          │ │          │ │ das      │ │          │ │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│  Fila 2 — Gráficas (2 columnas)                                    │
│  ┌────────────────────────────┐ ┌────────────────────────────────┐ │
│  │   Solicitudes por estado    │ │   Solicitudes por plantel     │ │
│  │   (Barras o circular)      │ │   (Barras)                    │ │
│  └────────────────────────────┘ └────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│  Fila 3 — Tendencia mensual                                        │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │   Solicitudes por mes (Líneas)                                  ││
│  └─────────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────┤
│  Fila 4 — Satisfacción y cancelaciones (2 columnas)                │
│  ┌────────────────────────────┐ ┌────────────────────────────────┐ │
│  │   Satisfacción institucion.│ │   Cancelaciones tardías        │ │
│  │   (Circular o estrellas)   │ │   (Barras o KPI doble)         │ │
│  └────────────────────────────┘ └────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│  Fila 5 — Próximos eventos                                         │
│  ┌─────────────────────────────────────────────────────────────────┐│
│  │   Lista de próximos eventos (tarjetas o tabla)                  ││
│  └─────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

## Responsive breakpoints

| Dispositivo | Columnas KPI | Gráficas |
|---|---|---|
| Desktop (≥1024px) | 5 | 2 columnas |
| Tablet (600px–1023px) | 2 | 1 columna |
| Móvil (<600px) | 1 | 1 columna |

## Iconografía sugerida (lucide-react)

| Métrica | Icono |
|---|---|
| Total solicitudes | `BarChart3` |
| Pendientes | `Clock` |
| Aprobadas | `CheckCircle2` |
| Completadas | `BadgeCheck` |
| Canceladas | `XCircle` |
| Eventos / Calendario | `Calendar` |
| Satisfacción | `Star` |
| Comentarios / Encuestas | `MessageSquare` |
| Cancelaciones tardías | `AlertTriangle` |

## Estructura de KPI Card

```tsx
<div style={{
  background: '#ffffff',
  borderRadius: '16px',
  padding: '1.25rem',
  boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
}}>
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>{titulo}</span>
    <IconComponent size={20} color="#1e3a8a" />
  </div>
  <span style={{ fontSize: '1.8rem', fontWeight: 700, color: '#1e293b' }}>{valor}</span>
  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>{descripcion}</span>
</div>
```

## Paleta semántica para gráficas

| Indicador | Color |
|---|---|
| Información general | `#1e3a8a` |
| Positivo / Aprobado | `#22c55e` (verde) |
| Negativo / Cancelado | `#dc2626` (rojo) |
| Advertencia / Pendiente | `#f59e0b` (ámbar) |
| Satisfacción | `#f59e0b` (ámbar / estrellas) |

## Resultado esperado

Esta skill será cargada automáticamente cada vez que se solicite crear dashboards, estadísticas o paneles administrativos en TigreTrack, asegurando consistencia visual corporativa en todos los componentes generados.
