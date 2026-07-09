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
    user: process.env.MAIL_USER ?? '',
    pass: process.env.MAIL_PASS ?? '',
  },
})

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173'

function accionesSolicitudHtml(solicitudId: number): string {
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
  return `
    <div style="margin-top:24px;padding-top:20px;border-top:1px solid #e2e8f0;">
      <p style="margin:0 0 14px;font-weight:700;color:#0f172a;font-size:14px;">Acciones de la Solicitud</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;">
        <a href="${FRONTEND_URL}/dashboard?solicitudId=${solicitudId}" style="display:inline-block;background:#1e3a8a;color:#ffffff;padding:10px 22px;border-radius:6px;text-decoration:none;font-weight:700;font-size:13px;">Ver Solicitud Completa</a>
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
  console.log('[MAIL] Email destinatario (admin):', 'josudcb.barca@gmail.com, 4ngel3duardofongestrada@gmail.com');

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

export async function enviarCorreoConfirmacionSolicitud(datos: DatosNotificacionEstado): Promise<void> {
  console.log('[MAIL] Enviando confirmación al solicitante');
  console.log('[MAIL] Email destinatario (solicitante):', datos.destinatario);

  if (!datos.destinatario) {
    console.error('[MAIL] Error: destinatario indefinido — no se puede enviar confirmación');
    return;
  }

  const cuerpo = `
    <p>Estimado(a) responsable,</p>
    <p>Su solicitud de cobertura ha sido <strong>recibida exitosamente</strong> y se encuentra en revisión.</p>
    <p>A continuación se presentan los detalles de su evento:</p>
    <p><strong>Evento:</strong> ${datos.nombreEvento}</p>
    <p><strong>Folio:</strong> ${datos.folio}</p>
    <p><strong>Fecha del evento:</strong> ${datos.fechaEvento}</p>
    <p><strong>Hora de inicio:</strong> ${datos.horaInicio}</p>
    <p><strong>Responsable:</strong> ${datos.responsableNombre}</p>
    <p>Recibirá una notificación cuando su solicitud sea aprobada.</p>
    ${accionesSolicitudHtml(datos.solicitudId)}
    <p>Atentamente,<br/>Sistema de Eventos UMAD</p>
  `

  const html = plantillaCorreoWrapper('Solicitud de cobertura recibida', cuerpo)

  await transport.sendMail({
    from: '"Sistema Eventos UMAD" <axelc.p6@gmail.com>',
    to: datos.destinatario,
    subject: `Solicitud recibida - ${datos.folio}`,
    html,
  })

  console.log('[MAIL] Confirmación enviada correctamente');
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
  horaFin?: string
  lugarEspecifico?: string
  responsableNombre: string
  motivo?: string
  descripcionCompleta?: string
}

export async function enviarCorreoAprobacion(datos: DatosNotificacionEstado): Promise<void> {
  console.log('[MAIL] Enviando correo de aprobación')
  console.log('[MAIL] Email destinatario (aprobación):', datos.destinatario);
  console.log('[DEBUG MAIL] Valores recibidos para ICS:', JSON.stringify({ fechaEvento: datos.fechaEvento, horaInicio: datos.horaInicio, horaFin: datos.horaFin }));

  if (!datos.destinatario) {
    console.error('[MAIL] Error: destinatario indefinido — no se puede enviar correo de aprobación');
    return;
  }

  const fechaRaw = typeof datos.fechaEvento === 'string' ? datos.fechaEvento : new Date(datos.fechaEvento).toISOString();
  const [ano = '0000', mes = '00', dia = '00'] = fechaRaw.split('T')[0]?.split('-') ?? [];

  const extraerHHMM = (horaVal: any): { hh: string; mm: string } => {
    if (!horaVal) return { hh: "00", mm: "00" };
    const s = horaVal instanceof Date ? horaVal.toISOString() : String(horaVal);
    const match = s.match(/(?:T|\s|^)(\d{2}):(\d{2})/);
    return match ? { hh: match[1] ?? "00", mm: match[2] ?? "00" } : { hh: "00", mm: "00" };
  };

  const inicio = extraerHHMM(datos.horaInicio);
  const fin = extraerHHMM(datos.horaFin);

  const fechaStartLocal = new Date(`${ano}-${mes}-${dia}T${inicio.hh}:${inicio.mm}:00-06:00`);
  const fechaEndLocal = new Date(`${ano}-${mes}-${dia}T${fin.hh}:${fin.mm}:00-06:00`);

  const dtStartStr = fechaStartLocal.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const dtEndStr = fechaEndLocal.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  console.log(`[DEBUG ICS] Fecha original: ${ano}-${mes}-${dia}. Generados para iCal UTC: ${dtStartStr} y ${dtEndStr}`);

  const ubicacion = datos.lugarEspecifico || 'Plantel UMAD'

  const rawIcal = `BEGIN:VCALENDAR
VERSION:2.0
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:solicitud_${datos.solicitudId}_${datos.folio}
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART:${dtStartStr}
DTEND:${dtEndStr}
SUMMARY:Cobertura: ${datos.nombreEvento}
DESCRIPTION:${datos.descripcionCompleta ? datos.descripcionCompleta.replace(/\n/g, '\\n') : ''}
LOCATION:${ubicacion}
ORGANIZER;CN=TigreTrack:mailto:${process.env.MAIL_USER}
ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=Solicitante:mailto:${datos.destinatario}
END:VEVENT
END:VCALENDAR`

  const icalContent = rawIcal.split('\n').map(line => line.trim()).filter(line => line.length > 0).join('\r\n')

  const cuerpo = `
    <p>Estimado(a) responsable,</p>
    <p>Nos complace informarle que su solicitud de cobertura ha sido <strong>aprobada exitosamente</strong>.</p>
    <p>A continuación se presentan los detalles de su evento:</p>
    <p><strong>Evento:</strong> ${datos.nombreEvento}</p>
    <p><strong>Folio:</strong> ${datos.folio}</p>
    <p><strong>Fecha del evento:</strong> ${datos.fechaEvento}</p>
    <p><strong>Hora de inicio:</strong> ${datos.horaInicio}</p>
    <p><strong>Ubicación:</strong> ${datos.lugarEspecifico || 'Plantel UMAD'}</p>
    <p><strong>Responsable:</strong> ${datos.responsableNombre}</p>
    <p>El evento ha sido agregado al calendario institucional para su seguimiento. Encontrará adjunta una invitación de calendario (.ics) que puede agregar a su calendario personal.</p>

    <div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:18px;margin:20px 0;text-align:center;">
      <p style="margin:0 0 6px;font-weight:700;color:#92400e;font-size:15px;">Evaluación del servicio</p>
      <p style="margin:0 0 14px;color:#78350f;font-size:13px;">Lo invitamos a evaluar la calidad del servicio recibido:</p>
      <a href="${FRONTEND_URL}/evaluar/${datos.folio}" style="display:inline-block;background:#f59e0b;color:#ffffff;padding:10px 28px;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px;">Evaluar servicio</a>
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
    icalEvent: {
      filename: 'invitacion-evento.ics',
      method: 'REQUEST',
      content: icalContent,
    },
  })

  console.log('[MAIL] Correo de aprobación enviado con invitacion .ics adjunta')
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
  console.log('[MAIL] Email destinatario (recordatorio):', datos.destinatario);

  if (!datos.destinatario) {
    console.error('[MAIL] Error: destinatario indefinido — no se puede enviar recordatorio');
    return;
  }

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
  console.log('[MAIL] Email destinatario (cancelación):', datos.destinatario);

  if (!datos.destinatario) {
    console.error('[MAIL] Error: destinatario indefinido — no se puede enviar correo de cancelación');
    return;
  }

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
  console.log('[MAIL] Email destinatario (modificación):', datos.editadoPor === 'admin' ? datos.emailDocente : 'josudcb.barca@gmail.com, 4ngel3duardofongestrada@gmail.com');

  if (datos.editadoPor === 'admin' && !datos.emailDocente) {
    console.error('[MAIL] Error: emailDocente indefinido — no se puede enviar correo de modificación al docente');
    return;
  }

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

interface ProveedorEvento {
  proveedorNombre: string
  proveedorEmail: string
  folio: string
  nombreEvento: string
  fechaEvento: string
  horaInicio: string
  horaFin: string
  lugar: string
  responsable: string
  contacto: string
}

export async function enviarNotificacionProveedor(
  tipo: 'asignacion' | 'cancelacion' | 'recordatorio',
  datos: ProveedorEvento,
): Promise<void> {
  if (tipo === 'asignacion') {
    const cuerpo = `
      <p>Estimado(a) <strong>${datos.proveedorNombre}</strong>,</p>
      <p>Nos complace informarle que ha sido <strong>seleccionado(a)</strong> para brindar sus servicios en el siguiente evento institucional:</p>

      <table style="width:100%;border-collapse:collapse;margin:18px 0;background:#f8fafc;border-radius:8px;overflow:hidden;">
        <tr><td style="padding:10px 14px;font-weight:700;color:#1e3a8a;border-bottom:1px solid #e2e8f0;font-size:13px;">Folio</td><td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;">${datos.folio}</td></tr>
        <tr><td style="padding:10px 14px;font-weight:700;color:#1e3a8a;border-bottom:1px solid #e2e8f0;font-size:13px;">Evento</td><td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;">${datos.nombreEvento}</td></tr>
        <tr><td style="padding:10px 14px;font-weight:700;color:#1e3a8a;border-bottom:1px solid #e2e8f0;font-size:13px;">Fecha</td><td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;">${datos.fechaEvento}</td></tr>
        <tr><td style="padding:10px 14px;font-weight:700;color:#1e3a8a;border-bottom:1px solid #e2e8f0;font-size:13px;">Horario</td><td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;">${datos.horaInicio} — ${datos.horaFin}</td></tr>
        <tr><td style="padding:10px 14px;font-weight:700;color:#1e3a8a;border-bottom:1px solid #e2e8f0;font-size:13px;">Ubicación</td><td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;">${datos.lugar}</td></tr>
        <tr><td style="padding:10px 14px;font-weight:700;color:#1e3a8a;border-bottom:1px solid #e2e8f0;font-size:13px;">Responsable</td><td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-size:13px;">${datos.responsable}</td></tr>
        <tr><td style="padding:10px 14px;font-weight:700;color:#1e3a8a;font-size:13px;">Contacto</td><td style="padding:10px 14px;font-size:13px;">${datos.contacto}</td></tr>
      </table>

      <p>Le agradecemos su participación y le solicitamos presentarse puntualmente el día del evento en la ubicación indicada.</p>
      <p>Si tiene alguna duda o requiere más información, no dude en ponerse en contacto con el responsable del evento.</p>
      <p style="margin-top:20px;">Atentamente,<br/><strong>Coordinación de Eventos — UMAD</strong></p>
    `

    const html = plantillaCorreoWrapper('Confirmación de Servicio Externo — UMAD', cuerpo)

    await transport.sendMail({
      from: '"Sistema Eventos UMAD" <axelc.p6@gmail.com>',
      to: datos.proveedorEmail,
      subject: `Confirmación de servicio — ${datos.nombreEvento}`,
      html,
    })

    console.log(`[MAIL] Correo de asignación enviado a ${datos.proveedorEmail}`)
  } else if (tipo === 'cancelacion') {
    const cuerpo = `
      <div style="background:#fef2f2;border:2px solid #dc2626;border-radius:10px;padding:18px 20px;margin-bottom:18px;text-align:center;">
        <p style="margin:0 0 4px;font-size:20px;font-weight:800;color:#991b1b;">⚠ AVISO IMPORTANTE</p>
        <p style="margin:0;font-weight:700;color:#dc2626;font-size:15px;">Cancelación de Evento</p>
      </div>

      <p>Estimado(a) <strong>${datos.proveedorNombre}</strong>,</p>
      <p>Lamentamos informarle que el evento para el cual fue asignado(a) ha sido <strong>cancelado</strong>. Por lo tanto, su servicio ya <strong>no será requerido</strong>.</p>

      <table style="width:100%;border-collapse:collapse;margin:18px 0;background:#fef2f2;border-radius:8px;overflow:hidden;">
        <tr><td style="padding:10px 14px;font-weight:700;color:#991b1b;border-bottom:1px solid #fca5a5;font-size:13px;">Folio</td><td style="padding:10px 14px;border-bottom:1px solid #fca5a5;font-size:13px;">${datos.folio}</td></tr>
        <tr><td style="padding:10px 14px;font-weight:700;color:#991b1b;border-bottom:1px solid #fca5a5;font-size:13px;">Evento</td><td style="padding:10px 14px;border-bottom:1px solid #fca5a5;font-size:13px;">${datos.nombreEvento}</td></tr>
        <tr><td style="padding:10px 14px;font-weight:700;color:#991b1b;border-bottom:1px solid #fca5a5;font-size:13px;">Fecha programada</td><td style="padding:10px 14px;border-bottom:1px solid #fca5a5;font-size:13px;">${datos.fechaEvento}</td></tr>
        <tr><td style="padding:10px 14px;font-weight:700;color:#991b1b;border-bottom:1px solid #fca5a5;font-size:13px;">Horario</td><td style="padding:10px 14px;border-bottom:1px solid #fca5a5;font-size:13px;">${datos.horaInicio} — ${datos.horaFin}</td></tr>
        <tr><td style="padding:10px 14px;font-weight:700;color:#991b1b;font-size:13px;">Ubicación</td><td style="padding:10px 14px;font-size:13px;">${datos.lugar}</td></tr>
      </table>

      <p style="margin-top:18px;">Agradecemos su disponibilidad y le ofrecemos una disculpa por los inconvenientes que esto pueda ocasionar. Quedamos a su disposición para futuras colaboraciones.</p>
      <p>Atentamente,<br/><strong>Coordinación de Eventos — UMAD</strong></p>
    `

    const html = plantillaCorreoWrapper('AVISO IMPORTANTE: Cancelación de Evento — UMAD', cuerpo)

    await transport.sendMail({
      from: '"Sistema Eventos UMAD" <axelc.p6@gmail.com>',
      to: datos.proveedorEmail,
      subject: `Cancelación de evento — ${datos.nombreEvento}`,
      html,
    })

    console.log(`[MAIL] Correo de cancelación enviado a ${datos.proveedorEmail}`)
  } else if (tipo === 'recordatorio') {
    const cuerpo = `
      <div style="background:#fefce8;border:2px solid #eab308;border-radius:10px;padding:18px 20px;margin-bottom:18px;text-align:center;">
        <p style="margin:0 0 4px;font-size:20px;font-weight:800;color:#854d0e;">📅 RECORDATORIO</p>
        <p style="margin:0;font-weight:700;color:#a16207;font-size:15px;">Servicio programado para mañana</p>
      </div>

      <p>Estimado(a) <strong>${datos.proveedorNombre}</strong>,</p>
      <p>Le recordamos que tiene un servicio <strong>agendado para mañana</strong>. A continuación los detalles:</p>

      <table style="width:100%;border-collapse:collapse;margin:18px 0;background:#fefce8;border-radius:8px;overflow:hidden;">
        <tr><td style="padding:10px 14px;font-weight:700;color:#854d0e;border-bottom:1px solid #fde68a;font-size:13px;">Folio</td><td style="padding:10px 14px;border-bottom:1px solid #fde68a;font-size:13px;">${datos.folio}</td></tr>
        <tr><td style="padding:10px 14px;font-weight:700;color:#854d0e;border-bottom:1px solid #fde68a;font-size:13px;">Evento</td><td style="padding:10px 14px;border-bottom:1px solid #fde68a;font-size:13px;">${datos.nombreEvento}</td></tr>
        <tr><td style="padding:10px 14px;font-weight:700;color:#854d0e;border-bottom:1px solid #fde68a;font-size:13px;">Fecha</td><td style="padding:10px 14px;border-bottom:1px solid #fde68a;font-size:13px;">${datos.fechaEvento}</td></tr>
        <tr><td style="padding:10px 14px;font-weight:700;color:#854d0e;border-bottom:1px solid #fde68a;font-size:13px;">Horario</td><td style="padding:10px 14px;border-bottom:1px solid #fde68a;font-size:13px;">${datos.horaInicio} — ${datos.horaFin}</td></tr>
        <tr><td style="padding:10px 14px;font-weight:700;color:#854d0e;border-bottom:1px solid #fde68a;font-size:13px;">Ubicación</td><td style="padding:10px 14px;border-bottom:1px solid #fde68a;font-size:13px;">${datos.lugar}</td></tr>
        <tr><td style="padding:10px 14px;font-weight:700;color:#854d0e;border-bottom:1px solid #fde68a;font-size:13px;">Responsable</td><td style="padding:10px 14px;border-bottom:1px solid #fde68a;font-size:13px;">${datos.responsable}</td></tr>
        <tr><td style="padding:10px 14px;font-weight:700;color:#854d0e;font-size:13px;">Contacto</td><td style="padding:10px 14px;font-size:13px;">${datos.contacto}</td></tr>
      </table>

      <p>Le solicitamos presentarse puntualmente en la ubicación indicada. Si tiene alguna duda, comuníquese con el responsable del evento.</p>
      <p style="margin-top:20px;">Atentamente,<br/><strong>Coordinación de Eventos — UMAD</strong></p>
    `

    const html = plantillaCorreoWrapper('RECORDATORIO: Servicio mañana — UMAD', cuerpo)

    await transport.sendMail({
      from: '"Sistema Eventos UMAD" <axelc.p6@gmail.com>',
      to: datos.proveedorEmail,
      subject: `Recordatorio de servicio — ${datos.nombreEvento}`,
      html,
    })

    console.log(`[MAIL] Correo de recordatorio enviado a ${datos.proveedorEmail}`)
  }
}
