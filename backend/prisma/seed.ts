import prisma from '../src/config/db.js'
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'

dotenv.config()

const Rol = {
  ADMIN: 'ADMIN',
  USER: 'USER'
} as const;

async function main() {
  console.log("Iniciando seed...");

  await prisma.materialSolicitado.deleteMany();
  await prisma.auditoriaCancelacion.deleteMany();
  await prisma.solicitudEvento.deleteMany();
  await prisma.usuario.deleteMany();
  await prisma.plantel.deleteMany();
  await prisma.institucion.deleteMany();
  await prisma.proveedor.deleteMany();

  const hashAdmin = await bcrypt.hash("admin123", 10);
  const hashUser = await bcrypt.hash("user123", 10);

  const usuarios = await prisma.usuario.createMany({
    data: [
      {
        correo: "4ngel3duardofongestrada@gmail.com",
        password: hashAdmin,
        rol: Rol.ADMIN,
      },
      { correo: "josudcb.barca@gmail.com", password: hashUser, rol: Rol.USER },
    ],
  });
  console.log(`Usuarios insertados: ${usuarios.count}`);

  const instituciones = await prisma.institucion.createMany({
    data: [{ nombre: "UMAD" }, { nombre: "IMM" }],
  });
  console.log(`Instituciones insertadas: ${instituciones.count}`);

  const planteles = await prisma.plantel.createMany({
    data: [
      { nombre: "UMAD Campus Puebla" },
      { nombre: "IMM Campus Centro" },
      { nombre: "IMM Campus Zavaleta" },
    ],
  });
  console.log(`Planteles insertados: ${planteles.count}`);

  const proveedores = await prisma.proveedor.createMany({
    data: [
      {
        nombre: "Audio y Sonido Profesional Puebla",
        especialidad: "Sonido, iluminación y audio profesional",
        activo: true,
      },
      {
        nombre: "Lonas y Estructuras Atlixco",
        especialidad: "Lonas, estructuras y material publicitario",
        activo: true,
      },
      {
        nombre: "Catering Express",
        especialidad: "Servicio de banquetes y coffee break",
        activo: true,
      },
    ],
  });
  console.log(`Proveedores insertados: ${proveedores.count}`);

  console.log("Seed completado exitosamente");
}

main()
  .catch((e) => {
    console.error("Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
