import type { Request, Response, NextFunction } from 'express';
export interface UsuarioPayload {
    id: number;
    correo: string;
    rol: 'ADMIN' | 'USER';
}
export declare function generarToken(payload: UsuarioPayload): string;
export declare function authMiddleware(req: Request, res: Response, next: NextFunction): void;
//# sourceMappingURL=auth.middleware.d.ts.map