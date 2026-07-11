import type { Request, Response } from 'express';
export declare const crearSolicitud: (req: Request, res: Response) => Promise<Response<any, Record<string, any>>>;
export declare function obtenerSolicitudes(req: Request, res: Response): Promise<void>;
export declare function obtenerSolicitudPorId(req: Request, res: Response): Promise<void>;
export declare function obtenerSolicitudPublica(req: Request, res: Response): Promise<void>;
export declare function actualizarEstado(req: Request, res: Response): Promise<void>;
export declare function editarSolicitud(req: Request, res: Response): Promise<void>;
export declare function asignarProveedores(req: Request, res: Response): Promise<void>;
export declare function exportarSolicitudPDF(req: Request, res: Response): Promise<void>;
export declare const subirCroquis: (import("express").RequestHandler<import("express-serve-static-core").ParamsDictionary, any, any, import("qs").ParsedQs, Record<string, any>> | ((req: Request, res: Response) => Promise<Response<any, Record<string, any>>>))[];
//# sourceMappingURL=solicitud.controller.d.ts.map