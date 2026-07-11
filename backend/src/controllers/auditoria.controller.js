import prisma from '../config/db.js';
export async function obtenerResumenCancelaciones(_req, res) {
    try {
        const cancelaciones = await prisma.auditoriaCancelacion.findMany({
            select: { tardia: true }
        });
        const tardias = cancelaciones.filter(c => c.tardia).length;
        const enTiempo = cancelaciones.filter(c => !c.tardia).length;
        const total = cancelaciones.length;
        res.json({ total, tardias, enTiempo });
    }
    catch (error) {
        console.error('Error al obtener resumen de cancelaciones:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}
//# sourceMappingURL=auditoria.controller.js.map