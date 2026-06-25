interface DatosSolicitud {
    folio: string;
    nombreEvento: string;
    fechaEvento: string;
    horaInicio: string;
    responsableNombre: string;
    departamentoSolicitante: string;
    contacto: string;
}
export declare function enviarAlertaNuevaSolicitud(datos: DatosSolicitud): Promise<void>;
export declare function enviarAlertaCancelacionTardia(datos: DatosSolicitud & {
    tardia: boolean;
}): Promise<void>;
interface DatosNotificacionEstado {
    destinatario: string;
    folio: string;
    nombreEvento: string;
    fechaEvento: string;
    horaInicio: string;
    responsableNombre: string;
    motivo?: string;
}
export declare function enviarCorreoAprobacion(datos: DatosNotificacionEstado): Promise<void>;
interface DatosRecordatorio {
    destinatario: string;
    folio: string;
    nombreEvento: string;
    fechaEvento: string;
    horaInicio: string;
    responsableNombre: string;
    diasRestantes: number;
}
export declare function enviarCorreoRecordatorio(datos: DatosRecordatorio): Promise<void>;
export declare function enviarCorreoCancelacion(datos: DatosNotificacionEstado): Promise<void>;
export {};
//# sourceMappingURL=mailService.d.ts.map