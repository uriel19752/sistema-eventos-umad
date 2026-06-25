import { TipoMaterial, type Estado } from '../generated/prisma/client.js';
import type { CrearSolicitudDTO } from '../dto/crearSolicitud.dto.js';
import type { ActualizarEstadoDTO } from '../dto/actualizarEstado.dto.js';
export interface UsuarioAuth {
    id: number;
    rol: 'ADMIN' | 'USER';
}
export declare function crearSolicitud(data: CrearSolicitudDTO, usuario: UsuarioAuth): Promise<{
    id: number;
    plantelId: number | null;
    institucionId: number | null;
    folio: string;
    nombreEvento: string;
    descripcion: string | null;
    objetivoCobertura: string | null;
    publicoObjetivo: string | null;
    autoridadesAsistentes: string | null;
    lugarEspecifico: string | null;
    ubicacion: string | null;
    fechaEvento: Date;
    horaInicio: Date;
    horaFin: Date;
    horaMontaje: Date | null;
    fechaSolicitud: Date;
    responsableNombre: string;
    contacto: string | null;
    departamentoSolicitante: string | null;
    observaciones: string | null;
    prioridad: import("../generated/prisma/enums.js").Prioridad;
    estado: Estado;
    googleEventId: string | null;
    googleEventLink: string | null;
    recordatorio7DiasEnviado: boolean;
    recordatorio24HorasEnviado: boolean;
    usuarioId: number | null;
}>;
export declare function obtenerSolicitudes(usuario: UsuarioAuth): Promise<{
    id: number;
    institucion: {
        id: number;
        nombre: string;
    } | null;
    plantel: {
        id: number;
        nombre: string;
    } | null;
    plantelId: number | null;
    institucionId: number | null;
    folio: string;
    nombreEvento: string;
    descripcion: string | null;
    objetivoCobertura: string | null;
    publicoObjetivo: string | null;
    autoridadesAsistentes: string | null;
    lugarEspecifico: string | null;
    ubicacion: string | null;
    fechaEvento: Date;
    horaInicio: Date;
    horaFin: Date;
    horaMontaje: Date | null;
    fechaSolicitud: Date;
    responsableNombre: string;
    contacto: string | null;
    departamentoSolicitante: string | null;
    observaciones: string | null;
    prioridad: import("../generated/prisma/enums.js").Prioridad;
    estado: Estado;
    googleEventId: string | null;
    googleEventLink: string | null;
    usuario: {
        id: number;
        correo: string;
        rol: import("../generated/prisma/enums.js").Rol;
    } | null;
    usuarioId: number | null;
}[]>;
export declare function obtenerSolicitudPorId(id: number, usuario: UsuarioAuth): Promise<{
    institucion: {
        id: number;
        nombre: string;
    } | null;
    plantel: {
        id: number;
        nombre: string;
    } | null;
    usuario: {
        id: number;
        correo: string;
        rol: import("../generated/prisma/enums.js").Rol;
    } | null;
    materialSolicitado: {
        id: number;
        tipoMaterial: TipoMaterial;
        descripcionOtro: string | null;
        solicitudId: number;
    }[];
} & {
    id: number;
    plantelId: number | null;
    institucionId: number | null;
    folio: string;
    nombreEvento: string;
    descripcion: string | null;
    objetivoCobertura: string | null;
    publicoObjetivo: string | null;
    autoridadesAsistentes: string | null;
    lugarEspecifico: string | null;
    ubicacion: string | null;
    fechaEvento: Date;
    horaInicio: Date;
    horaFin: Date;
    horaMontaje: Date | null;
    fechaSolicitud: Date;
    responsableNombre: string;
    contacto: string | null;
    departamentoSolicitante: string | null;
    observaciones: string | null;
    prioridad: import("../generated/prisma/enums.js").Prioridad;
    estado: Estado;
    googleEventId: string | null;
    googleEventLink: string | null;
    recordatorio7DiasEnviado: boolean;
    recordatorio24HorasEnviado: boolean;
    usuarioId: number | null;
}>;
export declare function actualizarEstado(id: number, data: ActualizarEstadoDTO, usuario: UsuarioAuth): Promise<{
    id: number;
    plantelId: number | null;
    institucionId: number | null;
    folio: string;
    nombreEvento: string;
    descripcion: string | null;
    objetivoCobertura: string | null;
    publicoObjetivo: string | null;
    autoridadesAsistentes: string | null;
    lugarEspecifico: string | null;
    ubicacion: string | null;
    fechaEvento: Date;
    horaInicio: Date;
    horaFin: Date;
    horaMontaje: Date | null;
    fechaSolicitud: Date;
    responsableNombre: string;
    contacto: string | null;
    departamentoSolicitante: string | null;
    observaciones: string | null;
    prioridad: import("../generated/prisma/enums.js").Prioridad;
    estado: Estado;
    googleEventId: string | null;
    googleEventLink: string | null;
    recordatorio7DiasEnviado: boolean;
    recordatorio24HorasEnviado: boolean;
    usuarioId: number | null;
}>;
//# sourceMappingURL=solicitud.service.d.ts.map