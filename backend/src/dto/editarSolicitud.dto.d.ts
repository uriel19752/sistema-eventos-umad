export interface EditarSolicitudDTO {
    folio?: string;
    nombreEvento?: string;
    descripcion?: string;
    objetivo?: string;
    publico?: string;
    autoridades?: string;
    lugarSeleccionado?: string;
    lugar?: string;
    ubicacion?: string;
    fechaEvento?: string;
    horaInicio?: string;
    horaFin?: string;
    horaMontaje?: string;
    responsableNombre?: string;
    contacto?: string;
    area?: string;
    observaciones?: string;
    materiales?: {
        fotografias?: boolean;
        notaWeb?: boolean;
        banners?: boolean;
        otro?: string;
    };
    plantelId?: number;
    institucionId?: number;
    institucionPersonalizada?: string;
    datosEspecificos?: Record<string, unknown>;
    croquisUrl?: string;
}
//# sourceMappingURL=editarSolicitud.dto.d.ts.map