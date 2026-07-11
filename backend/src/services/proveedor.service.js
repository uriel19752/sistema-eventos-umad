import prisma from '../config/db.js';
export async function obtenerProveedores(activo) {
    return prisma.proveedor.findMany({
        where: { activo: activo ?? true },
        orderBy: { id: 'asc' },
    });
}
export async function obtenerProveedorPorId(id) {
    const proveedor = await prisma.proveedor.findUnique({ where: { id } });
    if (!proveedor) {
        throw Object.assign(new Error('Proveedor no encontrado'), { statusCode: 404 });
    }
    return proveedor;
}
export async function crearProveedor(data) {
    return prisma.proveedor.create({ data });
}
export async function editarProveedor(id, data) {
    await obtenerProveedorPorId(id);
    return prisma.proveedor.update({ where: { id }, data });
}
export async function desactivarProveedor(id) {
    await obtenerProveedorPorId(id);
    return prisma.proveedor.update({ where: { id }, data: { activo: false } });
}
//# sourceMappingURL=proveedor.service.js.map