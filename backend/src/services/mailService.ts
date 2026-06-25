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
  departamentoSolicitante: string
  contacto: string
}

export async function enviarAlertaNuevaSolicitud(datos: DatosSolicitud): Promise<void> {
  console.log('[MAIL] Enviando correo de nueva solicitud');

  const html = `
    <h2>Nueva solicitud de cobertura registrada</h2>
    <p><strong>Folio:</strong> ${datos.folio}</p>
    <p><strong>Evento:</strong> ${datos.nombreEvento}</p>
    <p><strong>Fecha del evento:</strong> ${datos.fechaEvento}</p>
    <p><strong>Hora de inicio:</strong> ${datos.horaInicio}</p>
    <p><strong>Responsable:</strong> ${datos.responsableNombre}</p>
    <p><strong>Departamento:</strong> ${datos.departamentoSolicitante}</p>
    <p><strong>Contacto:</strong> ${datos.contacto}</p>
  `

  await transport.sendMail({
    from: '"Sistema Eventos UMAD" <axelc.p6@gmail.com>',
    to: ['josudcb.barca@gmail.com', '4ngel3duardofongestrada@gmail.com'],
    subject: `Nueva solicitud: ${datos.folio} — ${datos.nombreEvento}`,
    html,
  })

  console.log('[MAIL] Correo enviado correctamente');
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

interface DatosNotificacionEstado {
  destinatario: string
  folio: string
  nombreEvento: string
  fechaEvento: string
  horaInicio: string
  responsableNombre: string
  motivo?: string
}

export async function enviarCorreoAprobacion(datos: DatosNotificacionEstado): Promise<void> {
  console.log('[MAIL] Enviando correo de aprobación')

  const html = `
    <h2>Solicitud de cobertura aprobada</h2>
    <p>Estimado(a) responsable,</p>
    <p>Nos complace informarle que su solicitud de cobertura ha sido <strong>aprobada exitosamente</strong>.</p>
    <p>A continuación se presentan los detalles de su evento:</p>
    <p><strong>Evento:</strong> ${datos.nombreEvento}</p>
    <p><strong>Folio:</strong> ${datos.folio}</p>
    <p><strong>Fecha del evento:</strong> ${datos.fechaEvento}</p>
    <p><strong>Hora de inicio:</strong> ${datos.horaInicio}</p>
    <p><strong>Responsable:</strong> ${datos.responsableNombre}</p>
    <p>El evento ha sido agregado al calendario institucional para su seguimiento.</p>
    <p>Atentamente,<br/>Sistema de Eventos UMAD</p>
  `

  await transport.sendMail({
    from: '"Sistema Eventos UMAD" <axelc.p6@gmail.com>',
    to: datos.destinatario,
    subject: `Solicitud aprobada - ${datos.folio}`,
    html,
  })

  console.log('[MAIL] Correo de aprobación enviado')
}

interface DatosRecordatorio {
  destinatario: string
  folio: string
  nombreEvento: string
  fechaEvento: string
  horaInicio: string
  responsableNombre: string
  diasRestantes: number
}

export async function enviarCorreoRecordatorio(datos: DatosRecordatorio): Promise<void> {
  console.log('[MAIL] Enviando correo recordatorio')

  const diasTexto = datos.diasRestantes === 1
    ? 'Su evento se realizará mañana.'
    : `Su evento se realizará en ${datos.diasRestantes} días.`

  const html = `
    <h2>Recordatorio de evento</h2>
    <p>Estimado(a) responsable,</p>
    <p>${diasTexto}</p>
    <p>A continuación se presentan los detalles de su evento:</p>
    <p><strong>Evento:</strong> ${datos.nombreEvento}</p>
    <p><strong>Folio:</strong> ${datos.folio}</p>
    <p><strong>Fecha del evento:</strong> ${datos.fechaEvento}</p>
    <p><strong>Hora de inicio:</strong> ${datos.horaInicio}</p>
    <p><strong>Responsable:</strong> ${datos.responsableNombre}</p>
    <p>Atentamente,<br/>Sistema de Eventos UMAD</p>
  `

  await transport.sendMail({
    from: '"Sistema Eventos UMAD" <axelc.p6@gmail.com>',
    to: datos.destinatario,
    subject: `Recordatorio de Evento - ${datos.folio}`,
    html,
  })

  console.log('[MAIL] Correo recordatorio enviado')
}

export async function enviarCorreoCancelacion(datos: DatosNotificacionEstado): Promise<void> {
  console.log('[MAIL] Enviando correo de cancelación')

  const motivoHtml = datos.motivo
    ? `<p><strong>Motivo:</strong><br/>${datos.motivo}</p>`
    : ''

  const html = `
    <h2>Actualización de solicitud de cobertura</h2>
    <p>Estimado(a) responsable,</p>
    <p>Le informamos que su solicitud de cobertura ha sido <strong>cancelada</strong>.</p>
    <p><strong>Evento:</strong> ${datos.nombreEvento}</p>
    <p><strong>Folio:</strong> ${datos.folio}</p>
    <p><strong>Estado final:</strong> Cancelada</p>
    ${motivoHtml}
    <p>Para cualquier aclaración, favor de contactar al departamento correspondiente.</p>
    <p>Atentamente,<br/>Sistema de Eventos UMAD</p>
  `

  await transport.sendMail({
    from: '"Sistema Eventos UMAD" <axelc.p6@gmail.com>',
    to: datos.destinatario,
    subject: `Actualización de solicitud - ${datos.folio}`,
    html,
  })

  console.log('[MAIL] Correo de cancelación enviado')
}
