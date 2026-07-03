import prisma from "../src/config/db.js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

dotenv.config();

const Rol = {
  ADMIN: "ADMIN",
  USER: "USER",
} as const;

async function main() {
  console.log("Iniciando seed unificado de TigreTrack...");

  // 1. Limpieza con TRUNCATE CASCADE para reiniciar secuencias de PostgreSQL
  console.log("Limpiando tablas existentes con TRUNCATE CASCADE...");
  await prisma.$executeRawUnsafe(
    `TRUNCATE TABLE
      materiales_solicitados,
      auditoria_cancelaciones,
      encuestas_satisfaccion,
      asignacion_proveedores,
      solicitudes_eventos,
      usuarios,
      planteles,
      instituciones,
      proveedores
    RESTART IDENTITY CASCADE;`
  );

  // 2. Hashes de seguridad
  const hashAdmin = await bcrypt.hash("admin123", 10);
  const hashUser = await bcrypt.hash("user123", 10);

  // 3. Usuarios base
  await prisma.usuario.createMany({
    data: [
      {
        correo: "4ngel3duardofongestrada@gmail.com",
        password: hashAdmin,
        rol: Rol.ADMIN,
      },
      {
        correo: "josudcb.barca@gmail.com",
        password: hashUser,
        rol: Rol.USER,
      },
    ],
  });
  console.log("Usuarios insertados: 2");

  // 4. Catalogo de instituciones
  console.log("Creando catalogo de instituciones...");
  const instUmad = await prisma.institucion.create({
    data: { nombre: "UMAD" },
  });
  const instPrepa = await prisma.institucion.create({
    data: { nombre: "Prepa UMAD" },
  });
  const instImm = await prisma.institucion.create({
    data: { nombre: "IMM" },
  });
  const instImmSecundaria = await prisma.institucion.create({
    data: { nombre: "IMM Secundaria" },
  });
  const instImmPrimaria = await prisma.institucion.create({
    data: { nombre: "IMM Primaria" },
  });
  const instImmMaternal = await prisma.institucion.create({
    data: { nombre: "IMM Maternal" },
  });

  // 5. Catalogo de planteles
  console.log("Creando catalogo de planteles...");
  const campusPuebla = await prisma.plantel.create({
    data: { nombre: "UMAD Campus Puebla" },
  });
  const campusCentro = await prisma.plantel.create({
    data: { nombre: "IMM Campus Centro" },
  });
  const campusZavaleta = await prisma.plantel.create({
    data: { nombre: "IMM Campus Zavaleta" },
  });

  // 6. Proveedores originales
  await prisma.proveedor.createMany({
    data: [
      {
        nombre: "Audio y Sonido Profesional Puebla",
        especialidad: "Sonido, iluminacion y audio profesional",
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
  console.log("Proveedores insertados: 3");

  // 7. Solicitudes de eventos — 6 registros distribuidos en Mar, Abr, May 2026
  //    3 para IMM Campus Zavaleta, 3 para IMM Campus Centro
  console.log("Generando historial operativo de eventos...");

  // --- SOLICITUD 1: UMAD CAMPUS PUEBLA (Universidad) ---
  const solZavaleta1 = await prisma.solicitudEvento.create({
    data: {
      folio: 'EVT-2026-ZAV01',
      nombreEvento: 'Congreso Internacional de Ingeniería de Software',
      descripcion: 'Magno evento de desarrollo tecnológico en auditorio.',
      responsableNombre: 'Uriel Axel Calyeca',
      estado: 'Completada',
      prioridad: 'Alta',
      fechaEvento: new Date('2026-03-15'),
      horaInicio: new Date('2026-03-15T09:00:00Z'),
      horaFin: new Date('2026-03-15T14:00:00Z'),
      plantelId: campusPuebla.id, // <--- Vinculado a "UMAD Campus Puebla"
      institucionId: instUmad.id,   // Universidad
    }
  });

  // --- SOLICITUD 2: IMM CAMPUS ZAVALETA (Prepa) ---
  const solZavaleta2 = await prisma.solicitudEvento.create({
    data: {
      folio: 'EVT-2026-ZAV02',
      nombreEvento: 'Intercolegial de Robótica Prepas',
      descripcion: 'Competencia regional de prototipos automatizados.',
      responsableNombre: 'Angel Eduardo Fong',
      estado: 'Completada',
      prioridad: 'Media',
      fechaEvento: new Date('2026-04-10'),
      horaInicio: new Date('2026-04-10T10:00:00Z'),
      horaFin: new Date('2026-04-10T13:00:00Z'),
      plantelId: campusZavaleta.id, // <--- Vinculado a "IMM Campus Zavaleta"
      institucionId: instPrepa.id,
    }
  });

  const solZav03 = await prisma.solicitudEvento.create({
    data: {
      folio: "EVT-2026-ZAV03",
      nombreEvento: "Kermes Anual del Orgullo IMM",
      descripcion: "Festejo tradicional familiar de recaudacion.",
      responsableNombre: "Coordinacion IMM Zavaleta",
      estado: "Aprobado",
      prioridad: "Baja",
      fechaEvento: new Date("2026-05-22"),
      fechaSolicitud: new Date("2026-04-15T09:00:00Z"),
      horaInicio: new Date("2026-05-22T08:00:00Z"),
      horaFin: new Date("2026-05-22T16:00:00Z"),
      plantelId: campusZavaleta.id,
      institucionId: instImm.id,
    },
  });

  // --- IMM CAMPUS CENTRO (solo Prepa UMAD e IMM) ---
  const solCen01 = await prisma.solicitudEvento.create({
    data: {
      folio: "EVT-2026-CEN01",
      nombreEvento: "Torneo Relampago de Futbol Prepa Centro",
      descripcion: "Encuentros deportivos internos en canchas del campus.",
      responsableNombre: "Direccion de Deportes Centro",
      estado: "Completada",
      prioridad: "Media",
      fechaEvento: new Date("2026-04-18"),
      fechaSolicitud: new Date("2026-03-25T11:00:00Z"),
      horaInicio: new Date("2026-04-18T11:00:00Z"),
      horaFin: new Date("2026-04-18T15:00:00Z"),
      plantelId: campusCentro.id,
      institucionId: instPrepa.id,
    },
  });

  const solCen02 = await prisma.solicitudEvento.create({
    data: {
      folio: "EVT-2026-CEN02",
      nombreEvento: "Muestra Gastronomica Cultural IMM Centro",
      descripcion: "Exposicion y degustacion de platillos tradicionales.",
      responsableNombre: "Sociedad de Alumnos Centro",
      estado: "Completada",
      prioridad: "Media",
      fechaEvento: new Date("2026-05-05"),
      fechaSolicitud: new Date("2026-04-10T08:00:00Z"),
      horaInicio: new Date("2026-05-05T09:00:00Z"),
      horaFin: new Date("2026-05-05T13:00:00Z"),
      plantelId: campusCentro.id,
      institucionId: instImm.id,
    },
  });

  const solCen03 = await prisma.solicitudEvento.create({
    data: {
      folio: "EVT-2026-CEN03",
      nombreEvento: "Recital Musical de Primavera",
      descripcion:
        "Evento cultural suspendido por fallas imprevistas de logistica.",
      responsableNombre: "Talleres Culturales Centro",
      estado: "Cancelada",
      prioridad: "Baja",
      fechaEvento: new Date("2026-05-28"),
      fechaSolicitud: new Date("2026-05-02T16:00:00Z"),
      horaInicio: new Date("2026-05-28T17:00:00Z"),
      horaFin: new Date("2026-05-28T19:00:00Z"),
      plantelId: campusCentro.id,
      institucionId: instPrepa.id,
    },
  });

  console.log("Solicitudes insertadas: 6");

  // 8. Encuestas de satisfaccion
  //    Zavaleta: 5 estrellas (calidad operativa excelente)
  //    Centro: 3 y 4 estrellas (areas de oportunidad)
  console.log("Generando encuestas de satisfaccion mixtas...");

  // Zavaleta — 5 estrellas
  await prisma.encuestaSatisfaccion.create({
    data: {
      solicitudId: solZavaleta1.id,
      puntualidad: 5,
      calidadTecnica: 5,
      atencionStaff: 5,
      satisfaccionGral: 5,
      comentarios:
        "La cobertura fotografica y la nota web se publicaron en tiempo record. Excelente servicio de marketing.",
    },
  });
  await prisma.encuestaSatisfaccion.create({
    data: {
      solicitudId: solZavaleta2.id,
      puntualidad: 5,
      calidadTecnica: 5,
      atencionStaff: 5,
      satisfaccionGral: 5,
      comentarios:
        "Muy buena atencion por parte del equipo tecnico, los banners digitales quedaron impecables.",
    },
  });
  await prisma.encuestaSatisfaccion.create({
    data: {
      solicitudId: solZav03.id,
      puntualidad: 5,
      calidadTecnica: 5,
      atencionStaff: 5,
      satisfaccionGral: 5,
      comentarios:
        "La organizacion de la kermes estuvo impecable. Los asistentes quedaron muy satisfechos con la cobertura.",
    },
  });

  // Centro — 3 y 4 estrellas
  await prisma.encuestaSatisfaccion.create({
    data: {
      solicitudId: solCen01.id,
      puntualidad: 4,
      calidadTecnica: 4,
      atencionStaff: 4,
      satisfaccionGral: 4,
      comentarios:
        "Buen despliegue, aunque el fotografo llego unos minutos tarde al partido inaugural.",
    },
  });
  await prisma.encuestaSatisfaccion.create({
    data: {
      solicitudId: solCen02.id,
      puntualidad: 3,
      calidadTecnica: 3,
      atencionStaff: 3,
      satisfaccionGral: 3,
      comentarios:
        "Falto cobertura de redes sociales durante el cierre del evento gastronomico.",
    },
  });
  await prisma.encuestaSatisfaccion.create({
    data: {
      solicitudId: solCen03.id,
      puntualidad: 4,
      calidadTecnica: 4,
      atencionStaff: 4,
      satisfaccionGral: 4,
      comentarios:
        "A pesar de la cancelacion, el equipo respondio rapido para notificar a los asistentes. Buen protocolo.",
    },
  });

  console.log("Encuestas insertadas: 6");
  console.log("Seed completado exitosamente con historial analitico.");
}

main()
  .catch((e) => {
    console.error("Error en seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
