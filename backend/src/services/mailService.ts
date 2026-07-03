import nodemailer from 'nodemailer'
import dotenv from 'dotenv'

dotenv.config()

function plantillaCorreoWrapper(titulo: string, cuerpoHtml: string): string {
  return `
    <table cellpadding="0" cellspacing="0" style="width:100%;background:#f8fafc;font-family:'Segoe UI',Arial,Helvetica,sans-serif;">
      <tr>
        <td align="center" style="padding:30px 16px;">
          <table cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.06);">
            <tr>
              <td style="background:linear-gradient(135deg,#1e3a8a,#0f172a);padding:28px 32px;text-align:center;">
                <h1 style="margin:0;color:#ffffff;font-size:22px;letter-spacing:1px;">🐾 TIGRETRACK</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px 0;">
                <h2 style="margin:0 0 16px;color:#0f172a;font-size:18px;">${titulo}</h2>
              </td>
            </tr>
            <tr>
              <td style="padding:0 32px 24px;color:#334155;font-size:14px;line-height:1.6;">
                ${cuerpoHtml}
              </td>
            </tr>
            <tr>
              <td style="background:#f1f5f9;padding:16px 32px;text-align:center;font-size:12px;color:#64748b;">
                UMAD • PREPA UMAD • IMM
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `
}

const transport = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'axelc.p6@gmail.com',
    pass: process.env.EMAIL_PASS ?? '',
  },
})

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

function accionesSolicitudHtml(solicitudId: number): string {
  return `
    <div style="margin-top:24px;padding-top:20px;border-top:1px solid #e2e8f0;">
      <p style="margin:0 0 14px;font-weight:700;color:#0f172a;font-size:14px;">Acciones de la Solicitud</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <a href="${FRONTEND_URL}/solicitudes/detalle?id=${solicitudId}" style="display:inline-block;background:#1e3a8a;color:#ffffff;padding:10px 22px;border-radius:6px;text-decoration:none;font-weight:700;font-size:13px;">Ver Solicitud Completa</a>
        <a href="${FRONTEND_URL}/solicitudes/cancelar?id=${solicitudId}" style="display:inline-block;background:#dc2626;color:#ffffff;padding:10px 22px;border-radius:6px;text-decoration:none;font-weight:700;font-size:13px;">Cancelar Solicitud</a>
      </div>
    </div>
  `
}

interface DatosSolicitud {
  solicitudId: number
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

  const cuerpo = `
    <p><strong>Folio:</strong> ${datos.folio}</p>
    <p><strong>Evento:</strong> ${datos.nombreEvento}</p>
    <p><strong>Fecha del evento:</strong> ${datos.fechaEvento}</p>
    <p><strong>Hora de inicio:</strong> ${datos.horaInicio}</p>
    <p><strong>Responsable:</strong> ${datos.responsableNombre}</p>
    <p><strong>Departamento:</strong> ${datos.departamentoSolicitante}</p>
    <p><strong>Contacto:</strong> ${datos.contacto}</p>
    ${accionesSolicitudHtml(datos.solicitudId)}
  `

  const html = plantillaCorreoWrapper('Nueva solicitud de cobertura registrada', cuerpo)

  await transport.sendMail({
    from: '"Sistema Eventos UMAD" <axelc.p6@gmail.com>',
    to: ['josudcb.barca@gmail.com', '4ngel3duardofongestrada@gmail.com'],
    subject: `Nueva solicitud: ${datos.folio} — ${datos.nombreEvento}`,
    html,
  })

  console.log('[MAIL] Correo enviado correctamente');
}

export async function enviarAlertaCancelacionTardia(datos: DatosSolicitud & { tardia: boolean }): Promise<void> {
  const cuerpo = `
    <div style="background:#fef2f2;border:1px solid #fca5a5;border-radius:8px;padding:14px 18px;margin-bottom:16px;">
      <p style="margin:0;font-weight:700;color:#991b1b;">⚠ Cancelación tardía detectada</p>
    </div>
    <p><strong>Folio:</strong> ${datos.folio}</p>
    <p><strong>Evento:</strong> ${datos.nombreEvento}</p>
    <p><strong>Fecha del evento:</strong> ${datos.fechaEvento}</p>
    <p><strong>Hora:</strong> ${datos.horaInicio}</p>
    <p><strong>Responsable:</strong> ${datos.responsableNombre}</p>
    <p><strong>Auditoría activada:</strong> ${datos.tardia ? 'Sí — cancelación con menos de 48h de anticipación' : 'No'}</p>
    ${accionesSolicitudHtml(datos.solicitudId)}
  `

  const html = plantillaCorreoWrapper('Alerta de cancelación tardía', cuerpo)

  await transport.sendMail({
    from: '"Sistema Eventos UMAD" <axelc.p6@gmail.com>',
    to: '4ngel3duardofongestrada@gmail.com',
    subject: `[URGENTE] Cancelación tardía — ${datos.folio}`,
    html,
  })
}

interface DatosNotificacionEstado {
  destinatario: string
  solicitudId: number
  folio: string
  nombreEvento: string
  fechaEvento: string
  horaInicio: string
  responsableNombre: string
  motivo?: string
}

export async function enviarCorreoAprobacion(datos: DatosNotificacionEstado): Promise<void> {
  console.log('[MAIL] Enviando correo de aprobación')

  const cuerpo = `
    <p>Estimado(a) responsable,</p>
    <p>Nos complace informarle que su solicitud de cobertura ha sido <strong>aprobada exitosamente</strong>.</p>
    <p>A continuación se presentan los detalles de su evento:</p>
    <p><strong>Evento:</strong> ${datos.nombreEvento}</p>
    <p><strong>Folio:</strong> ${datos.folio}</p>
    <p><strong>Fecha del evento:</strong> ${datos.fechaEvento}</p>
    <p><strong>Hora de inicio:</strong> ${datos.horaInicio}</p>
    <p><strong>Responsable:</strong> ${datos.responsableNombre}</p>
    <p>El evento ha sido agregado al calendario institucional para su seguimiento.</p>

    <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:18px;margin:20px 0;text-align:center;">
      <p style="margin:0 0 6px;font-weight:700;color:#92400e;font-size:15px;">📋 Evaluación del servicio</p>
      <p style="margin:0 0 14px;color:#78350f;font-size:13px;">Lo invitamos a evaluar la calidad del servicio recibido:</p>
      <a href="http://localhost:5173/evaluar/${datos.folio}" style="display:inline-block;background:#f59e0b;color:#ffffff;padding:10px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px;">Evaluar servicio</a>
    </div>

    ${accionesSolicitudHtml(datos.solicitudId)}
    <p>Atentamente,<br/>Sistema de Eventos UMAD</p>
  `

  const html = plantillaCorreoWrapper('Solicitud de cobertura aprobada', cuerpo)

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
  solicitudId: number
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

  const cuerpo = `
    <p>Estimado(a) responsable,</p>
    <p>${diasTexto}</p>
    <p>A continuación se presentan los detalles de su evento:</p>
    <p><strong>Evento:</strong> ${datos.nombreEvento}</p>
    <p><strong>Folio:</strong> ${datos.folio}</p>
    <p><strong>Fecha del evento:</strong> ${datos.fechaEvento}</p>
    <p><strong>Hora de inicio:</strong> ${datos.horaInicio}</p>
    <p><strong>Responsable:</strong> ${datos.responsableNombre}</p>
    ${accionesSolicitudHtml(datos.solicitudId)}
    <p>Atentamente,<br/>Sistema de Eventos UMAD</p>
  `

  const html = plantillaCorreoWrapper('Recordatorio de evento', cuerpo)

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

  const cuerpo = `
    <p>Estimado(a) responsable,</p>
    <p>Le informamos que su solicitud de cobertura ha sido <strong>cancelada</strong>.</p>
    <p><strong>Evento:</strong> ${datos.nombreEvento}</p>
    <p><strong>Folio:</strong> ${datos.folio}</p>
    <p><strong>Estado final:</strong> Cancelada</p>
    ${motivoHtml}
    <p>Para cualquier aclaración, favor de contactar al departamento correspondiente.</p>
    ${accionesSolicitudHtml(datos.solicitudId)}
    <p>Atentamente,<br/>Sistema de Eventos UMAD</p>
  `

  const html = plantillaCorreoWrapper('Actualización de solicitud de cobertura', cuerpo)

  await transport.sendMail({
    from: '"Sistema Eventos UMAD" <axelc.p6@gmail.com>',
    to: datos.destinatario,
    subject: `Actualización de solicitud - ${datos.folio}`,
    html,
  })

  console.log('[MAIL] Correo de cancelación enviado')
}

interface DatosModificacion {
  solicitudId: number
  folio: string
  nombreEvento: string
  fechaEvento: string
  horaInicio: string
  responsableNombre: string
  editadoPor: 'solicitante' | 'admin'
  emailDocente?: string
}

export async function enviarCorreoModificacion(datos: DatosModificacion): Promise<void> {
  console.log('[MAIL] Enviando correo de modificación')

  const cuerpo = `
    <p>Se ha realizado una modificación a la solicitud de cobertura con los siguientes detalles:</p>
    <p><strong>Folio:</strong> ${datos.folio}</p>
    <p><strong>Evento:</strong> ${datos.nombreEvento}</p>
    <p><strong>Fecha del evento:</strong> ${datos.fechaEvento}</p>
    <p><strong>Hora de inicio:</strong> ${datos.horaInicio}</p>
    <p><strong>Responsable:</strong> ${datos.responsableNombre}</p>
    <p><strong>Modificado por:</strong> ${datos.editadoPor === 'admin' ? 'Administrador' : 'Solicitante'}</p>
    ${accionesSolicitudHtml(datos.solicitudId)}
  `

  const html = plantillaCorreoWrapper('Modificación de solicitud de cobertura', cuerpo)

  if (datos.editadoPor === 'solicitante') {
    await transport.sendMail({
      from: '"Sistema Eventos UMAD" <axelc.p6@gmail.com>',
      to: ['josudcb.barca@gmail.com', '4ngel3duardofongestrada@gmail.com'],
      subject: `Modificación de solicitud - ${datos.folio}`,
      html,
    })
  } else if (datos.editadoPor === 'admin' && datos.emailDocente) {
    await transport.sendMail({
      from: '"Sistema Eventos UMAD" <axelc.p6@gmail.com>',
      to: datos.emailDocente,
      subject: `Modificación de solicitud - ${datos.folio}`,
      html,
    })
  }

  console.log('[MAIL] Correo de modificación enviado')
}
