# Google Calendar — Configuración

## 1. Obtener credenciales

1. Ir a [Google Cloud Console](https://console.cloud.google.com/).
2. Seleccionar o crear un proyecto.
3. Habilitar la API de **Google Calendar API**.
4. Crear una **Cuenta de servicio** (Service Account).
5. Descargar el archivo JSON de la clave privada.

## 2. Colocar el archivo JSON

Copiar el archivo descargado en:

```
backend/credentials/google-service-account.json
```

> **IMPORTANTE:** Este archivo contiene la clave privada de la cuenta de servicio.
> Nunca debe subirse a GitHub. La carpeta `credentials/` ya está en `.gitignore`.

## 3. Configurar variables de entorno

Editar `backend/.env` y agregar:

```env
GOOGLE_CALENDAR_ID=tu_calendar_id@group.calendar.google.com
GOOGLE_SERVICE_ACCOUNT_PATH=./credentials/google-service-account.json
```

- `GOOGLE_CALENDAR_ID`: ID del calendario institucional donde se crearán los eventos.
- `GOOGLE_SERVICE_ACCOUNT_PATH`: Ruta relativa al archivo JSON de la cuenta de servicio.

## 4. Compartir el calendario con la cuenta de servicio

En Google Calendar:
1. Ir a la configuración del calendario institucional.
2. Agregar el correo de la cuenta de servicio (termina en `@...gserviceaccount.com`).
3. Asignar permisos de **"Hacer cambios en eventos"**.

## 5. Verificar que Git no rastrea las credenciales

```bash
git status
```

La carpeta `credentials/` y el archivo `.env` no deben aparecer como archivos sin seguimiento.

Si `credentials/` aparece, revisar que `.gitignore` contenga:

```
# Google Credentials
credentials/
```

## 6. Uso desde el código

```ts
import { getCalendarClient } from '../services/googleCalendar.service.js'

const calendar = getCalendarClient()
// calendar.events.insert(...) , calendar.events.delete(...) , etc.
```

La función `getCalendarClient()` valida que las variables de entorno existan y que el archivo JSON sea accesible. Lanza un error descriptivo si falta algo.
