/**
 * Elimina un evento de Google Calendar asociado a una solicitud cancelada.
 *
 * - Se ejecuta después de que la cancelación ya fue persistida en BD.
 * - Nunca lanza excepción; los errores se registran en consola.
 * - Útil también como base para futuras ampliaciones:
 *   → Actualización de eventos (editar fecha/hora/lugar).
 *   → Reprogramación (eliminar + crear con nuevos datos).
 */
export declare function eliminarEventoSolicitud(googleEventId: string | null | undefined): Promise<void>;
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
    ubicacion: string | null;
    publicoObjetivo: string | null;
    observaciones: string | null;
    googleEventId: string | null;
}
export declare function crearEventoSolicitud(solicitud: SolicitudData): Promise<{
    id: string;
    htmlLink: string;
} | null>;
export {};
//# sourceMappingURL=googleCalendarEvent.service.d.ts.map