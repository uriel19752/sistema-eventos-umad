interface DatosSolicitud {
    solicitudId: number;
    folio: string;
    nombreEvento: string;
    fechaEvento: string;
    horaInicio: string;
    responsableNombre: string;
    departamentoSolicitante: string;
    contacto: string;
}
export declare function enviarAlertaNuevaSolicitud(datos: DatosSolicitud): Promise<void>;
export declare function enviarCorreoConfirmacionSolicitud(datos: DatosNotificacionEstado): Promise<void>;
export declare function enviarAlertaCancelacionTardia(datos: DatosSolicitud & {
    tardia: boolean;
}): Promise<void>;
interface DatosNotificacionEstado {
    destinatario: string;
    solicitudId: number;
    folio: string;
    nombreEvento: string;
    fechaEvento: string;
    horaInicio: string;
    horaFin?: string;
    lugarEspecifico?: string;
    responsableNombre: string;
    motivo?: string;
    descripcionCompleta?: string;
}
export declare function enviarCorreoAprobacion(datos: DatosNotificacionEstado): Promise<void>;
interface DatosRecordatorio {
    destinatario: string;
    solicitudId: number;
    folio: string;
    nombreEvento: string;
    fechaEvento: string;
    horaInicio: string;
    responsableNombre: string;
    diasRestantes: number;
}
export declare function enviarCorreoRecordatorio(datos: DatosRecordatorio): Promise<void>;
export declare function enviarCorreoCancelacion(datos: DatosNotificacionEstado): Promise<void>;
interface DatosModificacion {
    solicitudId: number;
    folio: string;
    nombreEvento: string;
    fechaEvento: string;
    horaInicio: string;
    responsableNombre: string;
    editadoPor: 'solicitante' | 'admin';
    emailDocente?: string;
}
export declare function enviarCorreoModificacion(datos: DatosModificacion): Promise<void>;
interface ProveedorEvento {
    proveedorNombre: string;
    proveedorEmail: string;
    folio: string;
    nombreEvento: string;
    fechaEvento: string;
    horaInicio: string;
    horaFin: string;
    lugar: string;
    responsable: string;
    contacto: string;
}
export declare function enviarNotificacionProveedor(tipo: 'asignacion' | 'cancelacion' | 'recordatorio', datos: ProveedorEvento): Promise<void>;
export {};
//# sourceMappingURL=mailService.d.ts.map