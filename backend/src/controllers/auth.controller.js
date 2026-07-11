import { registrarUsuario, loginLocal, loginConGoogle } from '../services/auth.service.js';
export async function signupHandler(req, res) {
    try {
        const { nombre, email, password } = req.body;
        if (!nombre || !email || !password) {
            res.status(400).json({ error: 'Nombre, correo y contraseña son requeridos' });
            return;
        }
        const usuario = await registrarUsuario(nombre, email, password);
        res.status(201).json(usuario);
    }
    catch (error) {
        const err = error;
        if (err.statusCode === 400) {
            res.status(400).json({ error: err.message });
            return;
        }
        console.error('Error en signup:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}
export async function loginHandler(req, res) {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ error: 'Correo y contraseña requeridos' });
            return;
        }
        const resultado = await loginLocal(email, password);
        res.json(resultado);
    }
    catch (error) {
        const err = error;
        if (err.statusCode === 401) {
            res.status(401).json({ error: err.message });
            return;
        }
        console.error('Error en login:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}
export async function googleLoginHandler(req, res) {
    try {
        const { token } = req.body;
        if (!token) {
            res.status(400).json({ error: 'Token de Google requerido' });
            return;
        }
        const resultado = await loginConGoogle(token);
        res.json(resultado);
    }
    catch (error) {
        const err = error;
        if (err.statusCode === 401) {
            res.status(401).json({ error: err.message });
            return;
        }
        console.error('Error en login con Google:', err);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}
//# sourceMappingURL=auth.controller.js.map