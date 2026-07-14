/**
 * @file seed.ts
 * @description Script de inicialización y siembra (seeding) de base de datos de TigreTrack.
 * Purga el historial transaccional, genera catálogos institucionales, aprovisiona
 * proveedores base, inyecta historial operativo del año 2026 y crea las cuentas
 * iniciales de acceso (ADMIN / USER) utilizando criptografía Bcrypt y variables de entorno.
 */

import prisma from "../src/config/db.js";
import bcrypt from "bcrypt";
import dotenv from "dotenv";

// Inicializa las variables de entorno configuradas en el archivo .env local
dotenv.config();

/**
 * Mapeo estricto del enumerado de Roles definidos en el esquema de Prisma.
 * @readonly
 * @enum {string}
 */
const Rol = {
  ADMIN: "ADMIN",
  SOLICITANTE: "SOLICITANTE",
} as const;

async function main() {
  console.log("[SEED] Iniciando seed unificado de TigreTrack...");

  // ==========================================
  // 1. LIMPIEZA DE BASE DE DATOS (DÍA CERO)
  // ==========================================
  console.log("[SEED] Limpiando tablas existentes con TRUNCATE CASCADE...");

  /**
   * Se utiliza TRUNCATE CASCADE para vaciar todas las tablas relacionales y
   * RESTART IDENTITY para restablecer todos los contadores de IDs auto-incrementales a 1.
   * El orden respeta las restricciones de llave foránea de PostgreSQL.
   */
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

  // ==========================================
  // 2. CRIPTOGRAFÍA Y CONFIGURACIÓN DE ACCESOS
  // ==========================================
  console.log("[SEED] Generando credenciales de acceso seguras...");

  /**
   * Estrategia de aprovisionamiento de credenciales de seguridad:
   * 1. Intenta leer variables del .env (ADMIN_INIT_EMAIL, ADMIN_INIT_PASSWORD, etc.).
   * 2. Si no existen, utiliza valores institucionales genéricos por defecto (fallbacks).
   * Esto elimina cualquier correo real del código fuente, garantizando privacidad y cumplimiento de GDPR/LFPDPPP.
   */
  const adminEmail = process.env.ADMIN_INIT_EMAIL || "comunicacion.admin@umad.edu.mx";
  const adminPasswordPlana = process.env.ADMIN_INIT_PASSWORD || "AdminTigre2026!";

  const userEmail = process.env.USER_INIT_EMAIL || "docente.prueba@umad.edu.mx";
  const userPasswordPlana = process.env.USER_INIT_PASSWORD || "UserTigre2026!";

  // Generación de hashes criptográficos con un factor de costo de 10 salt rounds
  const hashAdmin = await bcrypt.hash(adminPasswordPlana, 10);
  const hashUser = await bcrypt.hash(userPasswordPlana, 10);

  // ==========================================
  // 3. INSERCIÓN DE USUARIOS DE PRUEBA
  // ==========================================
  await prisma.usuario.createMany({
    data: [
      {
        email: adminEmail,
        password: hashAdmin,
        rol: Rol.ADMIN,
      },
      {
        email: userEmail,
        password: hashUser,
        rol: Rol.SOLICITANTE,
      },
    ],
  });

  console.log("---");
  console.log("[SEED] Cuentas base inicializadas exitosamente:");
  console.log(`[ADMIN]: ${adminEmail}`);
  console.log(`[USER]:  ${userEmail}`);
  console.log("---");

  // ==========================================
  // 4. INYECCIÓN DEL CATÁLOGO DE INSTITUCIONES
  // ==========================================
  console.log("[SEED] Creando catálogo de instituciones base...");
  const instUmad = await prisma.institucion.create({ data: { nombre: "UMAD" } });
  const instPrepa = await prisma.institucion.create({ data: { nombre: "Prepa UMAD" } });
  const instImm = await prisma.institucion.create({ data: { nombre: "IMM" } });
  await prisma.institucion.create({ data: { nombre: "IMM Secundaria" } });
  await prisma.institucion.create({ data: { nombre: "IMM Primaria" } });
  await prisma.institucion.create({ data: { nombre: "IMM Maternal" } });
  await prisma.institucion.create({ data: { nombre: "Ingenierías" } });
  await prisma.institucion.create({ data: { nombre: "Arte y Humanidades" } });
  await prisma.institucion.create({ data: { nombre: "Negocios, Comercio y Derecho" } });
  await prisma.institucion.create({ data: { nombre: "Ciencias Sociales" } });

  // ==========================================
  // 5. INYECCIÓN DEL CATÁLOGO DE PLANTELES
  // ==========================================
  console.log("[SEED] Creando catálogo de planteles geográficos...");
  const campusPuebla = await prisma.plantel.create({ data: { nombre: "UMAD Campus Puebla" } });
  const campusCentro = await prisma.plantel.create({ data: { nombre: "IMM Campus Centro" } });
  const campusZavaleta = await prisma.plantel.create({ data: { nombre: "IMM Campus Zavaleta" } });

  // ==========================================
  // 6. REGISTRO DE PROVEEDORES DE SERVICIO
  // ==========================================
  console.log("[SEED] Registrando directorio de proveedores externos...");
  await prisma.proveedor.createMany({
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

  // ==========================================
  // 7. HISTORIAL OPERATIVO DE EVENTOS (2026)
  // ==========================================
  console.log("[SEED] Generando historial operativo y simulado de eventos...");

  // --- SOLICITUD 1: Congreso Internacional ---
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
      plantelId: campusPuebla.id,
      institucionId: instUmad.id,
    }
  });

  // --- SOLICITUD 2: Intercolegial de Robótica ---
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
      plantelId: campusZavaleta.id,
      institucionId: instPrepa.id,
    }
  });

  // --- SOLICITUD 3: Kermés Anual ---
  const solZav03 = await prisma.solicitudEvento.create({
    data: {
      folio: "EVT-2026-ZAV03",
      nombreEvento: "Kermes Anual del Orgullo IMM",
      descripcion: "Festejo tradicional familiar de recaudación.",
      responsableNombre: "Coordinación IMM Zavaleta",
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

  // --- SOLICITUD 4: Torneo Fútbol ---
  const solCen01 = await prisma.solicitudEvento.create({
    data: {
      folio: "EVT-2026-CEN01",
      nombreEvento: "Torneo Relámpago de Fútbol Prepa Centro",
      descripcion: "Encuentros deportivos internos en canchas del campus.",
      responsableNombre: "Dirección de Deportes Centro",
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

  // --- SOLICITUD 5: Muestra Gastronómica ---
  const solCen02 = await prisma.solicitudEvento.create({
    data: {
      folio: "EVT-2026-CEN02",
      nombreEvento: "Muestra Gastronómica Cultural IMM Centro",
      descripcion: "Exposición y degustación de platillos tradicionales.",
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

  // --- SOLICITUD 6: Recital Musical (Cancelada) ---
  const solCen03 = await prisma.solicitudEvento.create({
    data: {
      folio: "EVT-2026-CEN03",
      nombreEvento: "Recital Musical de Primavera",
      descripcion: "Evento cultural suspendido por fallas imprevistas de logística.",
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

  console.log("[SEED] Solicitudes de eventos insertadas con éxito (6 registros).");

  // ==========================================
  // 8. EVALUACIONES DE CALIDAD (CSAT)
  // ==========================================
  console.log("[SEED] Inyectando encuestas de satisfacción para métricas de calidad...");

  // Eventos de Campus Zavaleta (Rendimiento excelente - 5 Estrellas)
  await prisma.encuestaSatisfaccion.create({
    data: {
      solicitudId: solZavaleta1.id,
      puntualidad: 5,
      calidadTecnica: 5,
      atencionStaff: 5,
      satisfaccionGral: 5,
      comentarios: "La cobertura fotográfica y la nota web se publicaron en tiempo récord. Excelente servicio de marketing.",
    },
  });

  await prisma.encuestaSatisfaccion.create({
    data: {
      solicitudId: solZavaleta2.id,
      puntualidad: 5,
      calidadTecnica: 5,
      atencionStaff: 5,
      satisfaccionGral: 5,
      comentarios: "Muy buena atención por parte del equipo técnico, los banners digitales quedaron impecables.",
    },
  });

  await prisma.encuestaSatisfaccion.create({
    data: {
      solicitudId: solZav03.id,
      puntualidad: 5,
      calidadTecnica: 5,
      atencionStaff: 5,
      satisfaccionGral: 5,
      comentarios: "La organización de la kermés estuvo impecable. Los asistentes quedaron muy satisfechos con la cobertura.",
    },
  });

  // Eventos de Campus Centro (Áreas de oportunidad detectadas - 3 y 4 Estrellas)
  await prisma.encuestaSatisfaccion.create({
    data: {
      solicitudId: solCen01.id,
      puntualidad: 4,
      calidadTecnica: 4,
      atencionStaff: 4,
      satisfaccionGral: 4,
      comentarios: "Buen despliegue, aunque el fotógrafo llegó unos minutos tarde al partido inaugural.",
    },
  });

  await prisma.encuestaSatisfaccion.create({
    data: {
      solicitudId: solCen02.id,
      puntualidad: 3,
      calidadTecnica: 3,
      atencionStaff: 3,
      satisfaccionGral: 3,
      comentarios: "Faltó cobertura de redes sociales durante el cierre del evento gastronómico.",
    },
  });

  await prisma.encuestaSatisfaccion.create({
    data: {
      solicitudId: solCen03.id,
      puntualidad: 4,
      calidadTecnica: 4,
      atencionStaff: 4,
      satisfaccionGral: 4,
      comentarios: "A pesar de la cancelación por fuerza mayor, el equipo respondió rápido para notificar. Buen protocolo.",
    },
  });

  console.log("[SEED] Encuestas de satisfacción inyectadas (6 registros).");
  console.log("[SEED] Proceso de siembra de datos unificado completado con rotundo éxito.");
}

main()
  .catch((e) => {
    console.error("❌ [SEED FATAL] Error crítico detectado en el hilo del seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    // Desconexión limpia del cliente de base de datos PostgreSQL
    await prisma.$disconnect();
  });
