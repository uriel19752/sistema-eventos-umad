import nodemailer from 'nodemailer'
import dotenv from 'dotenv'

dotenv.config()

const transport = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'axelc.p6@gmail.com',
    pass: process.env.EMAIL_PASS ?? '',
  },
})

interface DatosSolicitud {
  folio: string
  nombreEvento: string
  fechaEvento: string
  horaInicio: string
  responsableNombre: string
}

export async function enviarAlertaNuevaSolicitud(datos: DatosSolicitud): Promise<void> {
  const html = `
    <h2>Nueva solicitud de cobertura registrada</h2>
    <p><strong>Folio:</strong> ${datos.folio}</p>
    <p><strong>Evento:</strong> ${datos.nombreEvento}</p>
    <p><strong>Fecha:</strong> ${datos.fechaEvento}</p>
    <p><strong>Hora:</strong> ${datos.horaInicio}</p>
    <p><strong>Responsable:</strong> ${datos.responsableNombre}</p>
  `

  await transport.sendMail({
    from: '"Sistema Eventos UMAD" <axelc.p6@gmail.com>',
    to: ['josudcb.barca@gmail.com', '4ngel3duardofongestrada@gmail.com'],
    subject: `Nueva solicitud: ${datos.folio} — ${datos.nombreEvento}`,
    html,
  })
}

export async function enviarAlertaCancelacionTardia(datos: DatosSolicitud & { tardia: boolean }): Promise<void> {
  const html = `
    <h2 style="color:#dc3545;">⚠ Cancelación tardía detectada</h2>
    <p><strong>Folio:</strong> ${datos.folio}</p>
    <p><strong>Evento:</strong> ${datos.nombreEvento}</p>
    <p><strong>Fecha del evento:</strong> ${datos.fechaEvento}</p>
    <p><strong>Hora:</strong> ${datos.horaInicio}</p>
    <p><strong>Responsable:</strong> ${datos.responsableNombre}</p>
    <p><strong>Auditoría activada:</strong> ${datos.tardia ? 'Sí — cancelación con menos de 48h de anticipación' : 'No'}</p>
  `

  await transport.sendMail({
    from: '"Sistema Eventos UMAD" <axelc.p6@gmail.com>',
    to: '4ngel3duardofongestrada@gmail.com',
    subject: `[URGENTE] Cancelación tardía — ${datos.folio}`,
    html,
  })
}
