import { google } from 'googleapis'
import fs from 'fs'

const SCOPES = ['https://www.googleapis.com/auth/calendar'] as const

let calendarClient: ReturnType<typeof google.calendar> | null = null

function validateEnv(): { keyFilePath: string; calendarId: string } {
  const keyFilePath = process.env.GOOGLE_SERVICE_ACCOUNT_PATH
  const calendarId = process.env.GOOGLE_CALENDAR_ID

  if (!keyFilePath) {
    throw new Error(
      '[Google Calendar] Falta GOOGLE_SERVICE_ACCOUNT_PATH en .env. ' +
      'Debe apuntar al archivo JSON de la cuenta de servicio.'
    )
  }

  if (!calendarId) {
    throw new Error(
      '[Google Calendar] Falta GOOGLE_CALENDAR_ID en .env. ' +
      'Debe ser el ID del calendario institucional de Google.'
    )
  }

  if (!fs.existsSync(keyFilePath)) {
    throw new Error(
      `[Google Calendar] No se encontró el archivo de credenciales: ${keyFilePath}. ` +
      'Coloca el JSON descargado desde Google Cloud Console en backend/credentials/.'
    )
  }

  return { keyFilePath, calendarId }
}

/**
 * Obtiene (o crea si es la primera vez) el cliente singleton de Google Calendar API.
 *
 * Lógica interna:
 * - Implementa un patrón singleton: `calendarClient` se almacena en el módulo y se reutiliza
 *   en todas las llamadas posteriores, evitando autenticar JWT en cada solicitud.
 * - La autenticación usa una Service Account de Google Cloud con alcance `calendar`
 *   (lectura/escritura), leyendo las credenciales desde el archivo JSON apuntado por
 *   `GOOGLE_SERVICE_ACCOUNT_PATH`.
 *
 * @throws {Error} Si `GOOGLE_SERVICE_ACCOUNT_PATH` o `GOOGLE_CALENDAR_ID` no están definidos en
 *   las variables de entorno, o si el archivo JSON de credenciales no existe en la ruta indicada.
 *
 * @returns {ReturnType<typeof google.calendar>} Instancia del cliente `calendar` de Google APIs
 *   versión 3, lista para ejecutar operaciones CRUD sobre el calendario institucional.
 */
export function getCalendarClient(): ReturnType<typeof google.calendar> {
  if (calendarClient) return calendarClient

  const { keyFilePath } = validateEnv()

  const auth = new google.auth.JWT({
    keyFile: keyFilePath,
    scopes: [...SCOPES],
  })

  calendarClient = google.calendar({ version: 'v3', auth })
  return calendarClient
}
