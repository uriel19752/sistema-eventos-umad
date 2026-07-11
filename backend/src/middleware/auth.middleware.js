import jwt from 'jsonwebtoken';
const SECRET = process.env.JWT_SECRET ?? 'tigretrack-secret-dev';
export function generarToken(payload) {
    return jwt.sign(payload, SECRET, { expiresIn: '24h' });
}
export function authMiddleware(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Token de acceso requerido' });
        return;
    }
    const token = header.slice(7);
    try {
        const decoded = jwt.verify(token, SECRET);
        req.usuario = decoded;
        next();
    }
    catch {
        res.status(401).json({ error: 'Token inválido o expirado' });
    }
}
//# sourceMappingURL=auth.middleware.js.map