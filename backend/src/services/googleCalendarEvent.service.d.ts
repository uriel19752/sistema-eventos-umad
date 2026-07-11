export declare function eliminarEventoSolicitud(googleEventId: string | null | undefined): Promise<void>;
interface MaterialInfo {
    tipoMaterial: string;
    descripcionOtro: string | null;
}
interface SolicitudData {
    id: number;
    folio: string;
    nombreEvento: string;
    fechaEvento: Date;
    horaInicio: Date;
    horaFin: Date;
    horaMontaje: Date | null;
    descripcion: string | null;
    objetivoCobertura: string | null;
    responsableNombre: string;
    departamentoSolicitante: string | null;
    lugarEspecifico: string | null;
    ubicacion: string | null;
    contacto: string | null;
    autoridadesAsistentes: string | null;
    observaciones: string | null;
    googleEventId: string | null;
    materialSolicitado?: MaterialInfo[];
}
export declare function construirDescription(solicitud: SolicitudData): string;
export declare function crearEventoSolicitud(solicitud: SolicitudData): Promise<{
    id: string;
    htmlLink: string;
} | null>;
export declare function actualizarEventoSolicitud(googleEventId: string, solicitud: SolicitudData): Promise<void>;
export {};
//# sourceMappingURL=googleCalendarEvent.service.d.ts.map