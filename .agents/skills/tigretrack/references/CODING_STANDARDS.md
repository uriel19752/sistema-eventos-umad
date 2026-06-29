# Estándares de Código — TigreTrack

## Frontend (React + TypeScript)

### Patrones de Componentes
- Usar **componentes funcionales** con hooks.
- Definir interfaces de props usando `interface`, no `type`.
- Nombres en PascalCase para componentes.
- Nombres en camelCase para funciones y variables.

### Estructura de un Componente

```tsx
import { useState } from 'react'
import type { FC } from 'react'

interface Props {
  id: number
  label: string
}

const MiComponente: FC<Props> = ({ id, label }) => {
  const [valor, setValor] = useState('')

  return (
    <div>{label}: {valor}</div>
  )
}

export default MiComponente
```

### Estado
- Usar `useState` para estado local.
- Extraer lógica compleja a funciones auxiliares fuera del componente.
- No poner lógica de negocio dentro del JSX.

### Llamadas API
- Usar `axios` para todas las peticiones HTTP.
- Centralizar errores con `axios.isAxiosError(err)`.
- Mostrar errores al usuario mediante estado local, no `alert()` (excepto validaciones críticas).

### Tipado
- `strict: true` en tsconfig.
- Preferir `interface` sobre `type` para props y DTOs.
- Usar `null` para valores ausentes, no `undefined` cuando sea posible.

### Estilos
- Mantener estilos en línea si el proyecto ya los usa.
- Extraer colores a constantes `COLORS` al inicio del archivo.
- No mezclar estilos en línea con CSS modules sin autorización.

---

## Backend (Node.js + Express + TypeScript)

### Estructura de Archivos

```
controllers/     ← Solo reciben request, llaman service, responden
services/        ← Lógica de negocio (funciones exportables)
routes/          ← Definen router y middleware por recurso
dto/             ← Interfaces de datos de entrada/salida
middlewares/     ← Funciones middleware reutilizables
```

### Controladores
- Mantenerlos **delgados**.
- No contener lógica de negocio.
- Capturar errores con `try/catch`.
- Usar `error.statusCode` para errores conocidos, `500` para desconocidos.

```ts
export async function crear(req: Request, res: Response): Promise<void> {
  try {
    const resultado = await service.crear(req.body)
    res.status(201).json(resultado)
  } catch (error: any) {
    const statusCode = error.statusCode || 500
    res.status(statusCode).json({ error: error.message })
  }
}
```

### Servicios
- Toda la lógica de negocio va aquí.
- Funciones `export async function`.
- Validar datos al inicio y lanzar errores con `statusCode`.
- Usar `Object.assign(new Error('mensaje'), { statusCode: 400 })`.

### DTOs
- Definir como `interface`.
- Campos requeridos sin `?`, opcionales con `?`.

```ts
export interface CrearSolicitudDTO {
  folio: string
  nombreEvento: string
  lugar?: string
  ubicacion?: string
}
```

### Acceso a Datos
- Usar siempre Prisma Client (`import prisma from '../config/db.js'`).
- Consultas con `select` explícito (no `include` a menos que se necesiten relaciones completas).
- Usar `$transaction` para operaciones que escriben en múltiples tablas.

### Manejo de Errores
- Errores conocidos: `throw Object.assign(new Error('mensaje'), { statusCode: 4xx })`.
- Errores de validación: `400`.
- No encontrado: `404`.
- Sin permisos: `403`.
- Conflicto: `409`.
- Capturar en controller y responder con `error.statusCode || 500`.

---

## Reglas Generales

- No duplicar lógica entre frontend y backend.
- Las validaciones críticas deben existir en **ambos** lados (defensa en profundidad).
- No usar `any` a menos que sea estrictamente necesario.
- No hardcodear valores sensibles; usar variables de entorno.
- Los commits deben describir el cambio, no el archivo modificado.
- No eliminar funcionalidad existente sin confirmación.
- No modificar el schema de Prisma sin autorización explícita.
