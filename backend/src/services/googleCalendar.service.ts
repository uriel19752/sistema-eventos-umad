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
