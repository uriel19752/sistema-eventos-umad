import type { Request, Response } from 'express';
export declare const crearSolicitud: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare function obtenerSolicitudes(req: Request, res: Response): Promise<void>;
export declare function obtenerSolicitudPorId(req: Request, res: Response): Promise<void>;
export declare function obtenerSolicitudPublica(req: Request, res: Response): Promise<void>;
export declare function actualizarEstado(req: Request, res: Response): Promise<void>;
export declare function editarSolicitud(req: Request, res: Response): Promise<void>;
//# sourceMappingURL=solicitud.controller.d.ts.map