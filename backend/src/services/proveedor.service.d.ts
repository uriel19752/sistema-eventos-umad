export declare function obtenerProveedores(activo?: boolean): Promise<{
    nombre: string;
    id: number;
    email: string | null;
    activo: boolean;
    especialidad: string | null;
    telefono: string | null;
}[]>;
export declare function obtenerProveedorPorId(id: number): Promise<{
    nombre: string;
    id: number;
    email: string | null;
    activo: boolean;
    especialidad: string | null;
    telefono: string | null;
}>;
export declare function crearProveedor(data: {
    nombre: string;
    especialidad?: string;
    email?: string;
    telefono?: string;
}): Promise<{
    nombre: string;
    id: number;
    email: string | null;
    activo: boolean;
    especialidad: string | null;
    telefono: string | null;
}>;
export declare function editarProveedor(id: number, data: {
    nombre?: string;
    especialidad?: string;
    email?: string;
    telefono?: string;
}): Promise<{
    nombre: string;
    id: number;
    email: string | null;
    activo: boolean;
    especialidad: string | null;
    telefono: string | null;
}>;
export declare function desactivarProveedor(id: number): Promise<{
    nombre: string;
    id: number;
    email: string | null;
    activo: boolean;
    especialidad: string | null;
    telefono: string | null;
}>;
//# sourceMappingURL=proveedor.service.d.ts.map