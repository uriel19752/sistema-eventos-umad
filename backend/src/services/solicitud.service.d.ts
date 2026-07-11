import { TipoMaterial, type Estado } from "../generated/prisma/client.js";
import type { CrearSolicitudDTO } from "../dto/crearSolicitud.dto.js";
import type { ActualizarEstadoDTO } from "../dto/actualizarEstado.dto.js";
import type { EditarSolicitudDTO } from "../dto/editarSolicitud.dto.js";
export interface UsuarioAuth {
    id: number;
    email?: string;
    rol: "ADMIN" | "SOLICITANTE";
}
export declare function crearSolicitud(data: CrearSolicitudDTO & {
    plantelId?: number;
    institucionId?: number;
    institucionPersonalizada?: string;
    datosEspecificos?: Record<string, unknown>;
    croquisUrl?: string;
}, usuario: UsuarioAuth): Promise<{
    id: number;
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
    institucionPersonalizada: string | null;
    datosEspecificos: import("@prisma/client/runtime/client").JsonValue | null;
    croquisUrl: string | null;
    observaciones: string | null;
    prioridad: import("../generated/prisma/enums.js").Prioridad;
    estado: Estado;
    googleEventId: string | null;
    googleEventLink: string | null;
    recordatorio7DiasEnviado: boolean;
    recordatorio24HorasEnviado: boolean;
    plantelId: number | null;
    institucionId: number | null;
    usuarioId: number | null;
}>;
export declare function obtenerSolicitudes(usuario: UsuarioAuth): Promise<{
    id: number;
    institucion: {
        nombre: string;
        id: number;
    } | null;
    plantel: {
        nombre: string;
        id: number;
    } | null;
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
    datosEspecificos: import("@prisma/client/runtime/client").JsonValue;
    croquisUrl: string | null;
    observaciones: string | null;
    prioridad: import("../generated/prisma/enums.js").Prioridad;
    estado: Estado;
    googleEventId: string | null;
    googleEventLink: string | null;
    usuario: {
        id: number;
        email: string;
        rol: import("../generated/prisma/enums.js").Rol;
    } | null;
    plantelId: number | null;
    institucionId: number | null;
    usuarioId: number | null;
}[]>;
export declare function obtenerSolicitudPorId(id: number, usuario: UsuarioAuth): Promise<{
    institucion: {
        nombre: string;
        id: number;
    } | null;
    plantel: {
        nombre: string;
        id: number;
    } | null;
    usuario: {
        id: number;
        email: string;
        rol: import("../generated/prisma/enums.js").Rol;
    } | null;
    materialSolicitado: {
        id: number;
        solicitudId: number;
        tipoMaterial: TipoMaterial;
        descripcionOtro: string | null;
    }[];
    asignacionProveedores: ({
        proveedor: {
            nombre: string;
            id: number;
            email: string | null;
            activo: boolean;
            especialidad: string | null;
            telefono: string | null;
        };
    } & {
        id: number;
        solicitudId: number;
        proveedorId: number;
    })[];
} & {
    id: number;
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
    institucionPersonalizada: string | null;
    datosEspecificos: import("@prisma/client/runtime/client").JsonValue | null;
    croquisUrl: string | null;
    observaciones: string | null;
    prioridad: import("../generated/prisma/enums.js").Prioridad;
    estado: Estado;
    googleEventId: string | null;
    googleEventLink: string | null;
    recordatorio7DiasEnviado: boolean;
    recordatorio24HorasEnviado: boolean;
    plantelId: number | null;
    institucionId: number | null;
    usuarioId: number | null;
}>;
export declare function actualizarEstado(id: number, data: ActualizarEstadoDTO, usuario: UsuarioAuth): Promise<{
    id: number;
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
    institucionPersonalizada: string | null;
    datosEspecificos: import("@prisma/client/runtime/client").JsonValue | null;
    croquisUrl: string | null;
    observaciones: string | null;
    prioridad: import("../generated/prisma/enums.js").Prioridad;
    estado: Estado;
    googleEventId: string | null;
    googleEventLink: string | null;
    recordatorio7DiasEnviado: boolean;
    recordatorio24HorasEnviado: boolean;
    plantelId: number | null;
    institucionId: number | null;
    usuarioId: number | null;
}>;
export declare function editarSolicitud(id: number, data: EditarSolicitudDTO, usuario: UsuarioAuth): Promise<{
    institucion: {
        nombre: string;
        id: number;
    } | null;
    plantel: {
        nombre: string;
        id: number;
    } | null;
    materialSolicitado: {
        id: number;
        solicitudId: number;
        tipoMaterial: TipoMaterial;
        descripcionOtro: string | null;
    }[];
} & {
    id: number;
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
    institucionPersonalizada: string | null;
    datosEspecificos: import("@prisma/client/runtime/client").JsonValue | null;
    croquisUrl: string | null;
    observaciones: string | null;
    prioridad: import("../generated/prisma/enums.js").Prioridad;
    estado: Estado;
    googleEventId: string | null;
    googleEventLink: string | null;
    recordatorio7DiasEnviado: boolean;
    recordatorio24HorasEnviado: boolean;
    plantelId: number | null;
    institucionId: number | null;
    usuarioId: number | null;
}>;
export declare function asignarProveedores(solicitudId: number, proveedorIds: number[]): Promise<({
    proveedor: {
        nombre: string;
        id: number;
        email: string | null;
        activo: boolean;
        especialidad: string | null;
        telefono: string | null;
    };
} & {
    id: number;
    solicitudId: number;
    proveedorId: number;
})[]>;
//# sourceMappingURL=solicitud.service.d.ts.map