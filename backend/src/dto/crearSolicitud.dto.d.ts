export interface CrearSolicitudDTO {
    folio: string;
    nombreEvento: string;
    descripcion?: string;
    objetivo?: string;
    publico?: string;
    autoridades?: string;
    lugarSeleccionado: string;
    lugar?: string;
    ubicacion?: string;
    fechaEvento: string;
    horaInicio: string;
    horaFin: string;
    horaMontaje?: string;
    responsableNombre: string;
    contacto?: string;
    area?: string;
    observaciones?: string;
    materiales?: {
        fotografias?: boolean;
        notaWeb?: boolean;
        banners?: boolean;
        otro?: string;
    };
}
//# sourceMappingURL=crearSolicitud.dto.d.ts.map