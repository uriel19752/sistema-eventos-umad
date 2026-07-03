export declare function crearNotificacion(usuarioId: number, titulo: string, mensaje: string): Promise<{
    id: number;
    usuarioId: number;
    titulo: string;
    mensaje: string;
    leida: boolean;
    fechaCreacion: Date;
}>;
export declare function obtenerNotificacionesUsuario(usuarioId: number): Promise<{
    id: number;
    usuarioId: number;
    titulo: string;
    mensaje: string;
    leida: boolean;
    fechaCreacion: Date;
}[]>;
export declare function marcarComoLeida(id: number, usuarioId: number): Promise<import("../generated/prisma/internal/prismaNamespace.js").BatchPayload>;
export declare function generarRecordatoriosAutomatizados(): Promise<void>;
//# sourceMappingURL=notificacion.service.d.ts.map