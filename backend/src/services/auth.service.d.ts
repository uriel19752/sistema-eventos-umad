export declare function registrarUsuario(nombre: string, email: string, password: string): Promise<{
    nombre: string | null;
    id: number;
    email: string;
    googleId: string | null;
    rol: import("../generated/prisma/enums.js").Rol;
    activo: boolean;
    createdAt: Date;
}>;
export declare function loginLocal(email: string, password: string): Promise<{
    usuario: {
        nombre: string | null;
        id: number;
        email: string;
        googleId: string | null;
        rol: import("../generated/prisma/enums.js").Rol;
        activo: boolean;
        createdAt: Date;
    };
    token: string;
}>;
export declare function loginConGoogle(idToken: string): Promise<{
    usuario: {
        nombre: string | null;
        id: number;
        email: string;
        googleId: string | null;
        rol: import("../generated/prisma/enums.js").Rol;
        activo: boolean;
        createdAt: Date;
    };
    token: string;
}>;
//# sourceMappingURL=auth.service.d.ts.map