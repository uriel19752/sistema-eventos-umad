import prisma from "../config/db.js";
import { Prisma } from "../generated/prisma/client.js";
import type { Estado } from "../generated/prisma/client.js";
import type { FiltrosEstadisticas, DashboardEstadisticas, InsightsData, EntidadLider, MesMasActivo, TendenciaGeneral } from "../types/estadisticas.js";

function buildDateFilter(fechaInicio?: string, fechaFin?: string): Record<string, unknown> {
  const filter: Record<string, Date> = {};
  if (fechaInicio) filter.gte = new Date(fechaInicio);
  if (fechaFin) filter.lte = new Date(fechaFin + "T23:59:59.999Z");
  return Object.keys(filter).length > 0 ? { fechaSolicitud: filter } : {};
}

export async function obtenerDashboardEstadisticas(filtros?: FiltrosEstadisticas): Promise<DashboardEstadisticas> {
  const dateWhere = buildDateFilter(filtros?.fechaInicio, filtros?.fechaFin);

  const baseWhere: Record<string, unknown> = { ...dateWhere };

  if (filtros?.plantel && filtros.plantel !== "todos") {
    baseWhere.plantel = { nombre: filtros.plantel };
  }
  if (filtros?.institucion && filtros.institucion !== "todos") {
    baseWhere.institucion = { nombre: filtros.institucion };
  }

  /*
   * ── 1. CONTADORES POR ESTADO ──
   *
   * Optimización: groupBy reemplaza 5 consultas COUNT individuales por una sola
   * consulta agregada. La BD agrupa por estado y cuenta simultáneamente todos
   * los grupos en un único viaje de ida-vuelta, reduciendo consultas de 5 a 1.
   */
  const groupByEstados = await prisma.solicitudEvento.groupBy({
    by: ["estado"],
    where: baseWhere,
    _count: true,
  });

  const countMap: { [K in Estado]: number } = {
    Pendiente: 0,
    Aprobado: 0,
    Completada: 0,
    Cancelada: 0,
  };
  for (const entry of groupByEstados) {
    countMap[entry.estado] = entry._count;
  }

  const totalSolicitudes = groupByEstados.reduce((acc, e) => acc + e._count, 0);
  const pendientes = countMap["Pendiente"];
  const aprobadas = countMap["Aprobado"];
  const completadas = countMap["Completada"];
  const canceladas = countMap["Cancelada"];

  const wherePorPlantel: Record<string, unknown> = { ...dateWhere };
  if (filtros?.institucion && filtros.institucion !== "todos") {
    wherePorPlantel.institucion = { nombre: filtros.institucion };
  }

  const wherePorInstitucion: Record<string, unknown> = { ...dateWhere };
  if (filtros?.plantel && filtros.plantel !== "todos") {
    wherePorInstitucion.plantel = { nombre: filtros.plantel };
  }

  const today = new Date();
  let startDate: Date;
  let endDate: Date;

  if (filtros?.fechaInicio) {
    startDate = new Date(filtros.fechaInicio);
  } else {
    startDate = new Date(today.getFullYear(), today.getMonth() - 11, 1);
  }

  if (filtros?.fechaFin) {
    endDate = new Date(filtros.fechaFin);
  } else {
    endDate = today;
  }

  const conteoMeses: Record<string, number> = {};
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  const endMonth = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 1);
  while (cursor < endMonth) {
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    conteoMeses[`${cursor.getFullYear()}-${m}`] = 0;
    cursor.setMonth(cursor.getMonth() + 1);
  }

  /*
   * ── 3. GENERACIÓN DEL HISTORIAL MENSUAL (queryRaw) ──
   *
   * Optimización: $queryRaw reemplaza findMany + agrupación en memoria.
   * La consulta SQL ejecuta GROUP BY y COUNT nativamente en PostgreSQL, evitando
   * transferir miles de filas de fechaSolicitud al servidor Node.js. Esto reduce
   * drásticamente el uso de memoria y el tiempo de procesamiento en el backend.
   *
   * Se construyen condiciones SQL dinámicas con Prisma.sql y Prisma.join para
   * mantener la seguridad contra inyección SQL mediante parámetros tipados.
   */

  // Construir condiciones WHERE para la consulta SQL respetando los filtros actuales
  const sqlConditions: Prisma.Sql[] = [];

  // Rango del mes inicial y final (siempre presente para delimitar el histiorial)
  sqlConditions.push(
    Prisma.sql`se.fecha_solicitud >= ${new Date(startDate.getFullYear(), startDate.getMonth(), 1)}::timestamp`,
  );
  sqlConditions.push(
    Prisma.sql`se.fecha_solicitud < ${new Date(endDate.getFullYear(), endDate.getMonth() + 1, 1)}::timestamp`,
  );

  // Filtro adicional por fecha de inicio (si es más restrictivo que el rango mensual)
  if (filtros?.fechaInicio) {
    sqlConditions.push(Prisma.sql`se.fecha_solicitud >= ${new Date(filtros.fechaInicio)}::timestamp`);
  }

  // Filtro adicional por fecha de fin (si es más restrictivo que el rango mensual)
  if (filtros?.fechaFin) {
    sqlConditions.push(Prisma.sql`se.fecha_solicitud <= ${new Date(filtros.fechaFin + "T23:59:59.999Z")}::timestamp`);
  }

  if (filtros?.plantel && filtros.plantel !== "todos") {
    sqlConditions.push(Prisma.sql`p.nombre = ${filtros.plantel}`);
  }

  if (filtros?.institucion && filtros.institucion !== "todos") {
    sqlConditions.push(Prisma.sql`i.nombre = ${filtros.institucion}`);
  }

  const whereSQL = Prisma.join(sqlConditions, " AND ");

  const [planteles, instituciones, eventosPorMes, promediosEncuesta, materiales] = await Promise.all([
    prisma.plantel.findMany({
      include: {
        _count: {
          select: { solicitudEventos: { where: wherePorPlantel } },
        },
      },
    }),

    prisma.institucion.findMany({
      include: {
        _count: {
          select: { solicitudEventos: { where: wherePorInstitucion } },
        },
      },
    }),

    prisma.$queryRaw<Array<{ año: number; mes_num: number; total: bigint }>>`
      SELECT
        EXTRACT(YEAR FROM se.fecha_solicitud)::int AS año,
        EXTRACT(MONTH FROM se.fecha_solicitud)::int AS mes_num,
        COUNT(*)::int AS total
      FROM solicitudes_eventos se
      LEFT JOIN planteles p ON se.plantel_id = p.id
      LEFT JOIN instituciones i ON se.institucion_id = i.id
      WHERE ${whereSQL}
      GROUP BY EXTRACT(YEAR FROM se.fecha_solicitud), EXTRACT(MONTH FROM se.fecha_solicitud)
      ORDER BY MIN(se.fecha_solicitud) ASC
    `,

    prisma.encuestaSatisfaccion.aggregate({
      where: { solicitud: baseWhere },
      _avg: {
        puntualidad: true,
        calidadTecnica: true,
        atencionStaff: true,
        satisfaccionGral: true,
      },
      _count: { id: true },
    }),

    prisma.$queryRaw<Array<{ tipo: string; total: bigint }>>`
      SELECT ms.tipo_material::text AS tipo, COUNT(*)::int AS total
      FROM materiales_solicitados ms
      INNER JOIN solicitudes_eventos se ON ms.solicitud_id = se.id
      LEFT JOIN planteles p ON se.plantel_id = p.id
      LEFT JOIN instituciones i ON se.institucion_id = i.id
      WHERE ${whereSQL}
      GROUP BY ms.tipo_material
      ORDER BY total DESC
    `,
  ]);

  for (const row of eventosPorMes) {
    const key = `${row.año}-${String(row.mes_num).padStart(2, "0")}`;
    if (key in conteoMeses) {
      conteoMeses[key] = Number(row.total);
    }
  }

  const monthsRaw = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
  ];

  const porMes = Object.entries(conteoMeses).map(([ym, total]) => {
    const m = parseInt(ym.split("-")[1]!, 10);
    return { mes: monthsRaw[m - 1] ?? "", total };
  });

  const porPlantel = planteles
    .map((p) => ({ nombre: p.nombre, total: p._count.solicitudEventos }))
    .sort((a, b) => b.total - a.total);

  const porInstitucion = instituciones
    .map((i) => ({ nombre: i.nombre, total: i._count.solicitudEventos }))
    .sort((a, b) => b.total - a.total);

  const porMaterial = materiales.map((m) => ({ tipo: m.tipo, total: Number(m.total) }));

  /*
   * ── 2. TENDENCIAS MENSUALES ──
   *
   * Optimización: 2 groupBy reemplazan 10 consultas COUNT individuales
   * (5 por mes actual + 5 por mes anterior). Cada groupBy obtiene todos los
   * estados en una sola consulta agregada, reduciendo las consultas de 10 a 2.
   *
   * Solo se calculan cuando no hay filtros de rango de fechas activos.
   */
  let tendencias = {
    totalSolicitudes: 0,
    pendientes: 0,
    aprobadas: 0,
    completadas: 0,
    canceladas: 0,
  };

  if (!filtros?.fechaInicio && !filtros?.fechaFin) {
    const startOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfNextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const startOfPreviousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    const [currentGroup, previousGroup] = await Promise.all([
      prisma.solicitudEvento.groupBy({
        by: ["estado"],
        where: {
          ...baseWhere,
          fechaSolicitud: { gte: startOfCurrentMonth, lt: startOfNextMonth } as const,
        },
        _count: true,
      }),
      prisma.solicitudEvento.groupBy({
        by: ["estado"],
        where: {
          ...baseWhere,
          fechaSolicitud: { gte: startOfPreviousMonth, lt: startOfCurrentMonth } as const,
        },
        _count: true,
      }),
    ]);

    const buildCountMap = (groups: Array<{ estado: Estado; _count: number }>) => {
      const map: { [K in Estado]: number } = {
        Pendiente: 0,
        Aprobado: 0,
        Completada: 0,
        Cancelada: 0,
      };
      for (const g of groups) map[g.estado] = g._count;
      return map;
    };

    const currentMap = buildCountMap(currentGroup);
    const previousMap = buildCountMap(previousGroup);

    const currentTotal = currentGroup.reduce((acc, e) => acc + e._count, 0);
    const previousTotal = previousGroup.reduce((acc, e) => acc + e._count, 0);

    const calcVariacion = (actual: number, anterior: number) =>
      anterior === 0 ? 100 : Math.round(((actual - anterior) / anterior) * 100);

    tendencias = {
      totalSolicitudes: calcVariacion(currentTotal, previousTotal),
      pendientes: calcVariacion(currentMap["Pendiente"], previousMap["Pendiente"]),
      aprobadas: calcVariacion(currentMap["Aprobado"], previousMap["Aprobado"]),
      completadas: calcVariacion(currentMap["Completada"], previousMap["Completada"]),
      canceladas: calcVariacion(currentMap["Cancelada"], previousMap["Cancelada"]),
    };
  }

  // ── 4. INSIGHTS ESTRATÉGICOS ──
  const plantelLider: EntidadLider = porPlantel.length > 0
    ? {
        nombre: porPlantel[0]!.nombre,
        porcentaje: totalSolicitudes > 0
          ? Math.round((porPlantel[0]!.total / totalSolicitudes) * 100)
          : 0,
      }
    : { nombre: "N/A", porcentaje: 0 };

  const institucionLider: EntidadLider = porInstitucion.length > 0
    ? {
        nombre: porInstitucion[0]!.nombre,
        porcentaje: totalSolicitudes > 0
          ? Math.round((porInstitucion[0]!.total / totalSolicitudes) * 100)
          : 0,
      }
    : { nombre: "N/A", porcentaje: 0 };

  const mesMasActivo: MesMasActivo = porMes.length > 0
    ? (() => {
        const max = porMes.reduce((max, m) => m.total > max.total ? m : max, porMes[0]!);
        return { nombre: max.mes, total: max.total };
      })()
    : { nombre: "N/A", total: 0 };

  const tasaCancelacion = totalSolicitudes > 0
    ? Math.round((canceladas / totalSolicitudes) * 1000) / 10
    : 0;

  const pctTendencia = tendencias.totalSolicitudes;
  const tipoTendencia: TendenciaGeneral["tipo"] = pctTendencia > 5
    ? "crecimiento"
    : pctTendencia < -5
      ? "decrecimiento"
      : "estable";

  const insights: InsightsData = {
    plantelLider,
    institucionLider,
    mesMasActivo,
    tasaCancelacion,
    tendenciaGeneral: {
      porcentaje: pctTendencia,
      tipo: tipoTendencia,
    },
  };

  const promediosFormateados = {
    puntualidad: promediosEncuesta._avg.puntualidad !== null ? Number(promediosEncuesta._avg.puntualidad.toFixed(1)) : 0,
    calidadTecnica: promediosEncuesta._avg.calidadTecnica !== null ? Number(promediosEncuesta._avg.calidadTecnica.toFixed(1)) : 0,
    atencionStaff: promediosEncuesta._avg.atencionStaff !== null ? Number(promediosEncuesta._avg.atencionStaff.toFixed(1)) : 0,
    satisfaccionGral: promediosEncuesta._avg.satisfaccionGral !== null ? Number(promediosEncuesta._avg.satisfaccionGral.toFixed(1)) : 0,
    totalEncuestas: promediosEncuesta._count.id,
  };

  // ── 5. CSAT: DISTRIBUCIÓN DE ESTRELLAS ──
  const distribucionRaw = await prisma.encuestaSatisfaccion.groupBy({
    by: ['satisfaccionGral'],
    where: { solicitud: baseWhere },
    _count: true,
  });

  const distribucionEstrellas = [5, 4, 3, 2, 1].map(estrellas => {
    const found = distribucionRaw.find(d => d.satisfaccionGral === estrellas);
    return { estrellas, total: found?._count ?? 0 };
  });

  // ── 6. CSAT: VARIACIÓN RESPECTO AL PERIODO ANTERIOR ──
  let prevDateStart: Date;
  let prevDateEnd: Date;

  if (filtros?.fechaInicio) {
    const currentStart = new Date(filtros.fechaInicio);
    const currentEnd = filtros.fechaFin ? new Date(filtros.fechaFin) : new Date();
    const periodLen = currentEnd.getTime() - currentStart.getTime();
    prevDateEnd = new Date(currentStart);
    prevDateStart = new Date(prevDateEnd.getTime() - periodLen);
  } else {
    prevDateEnd = new Date(today.getFullYear(), today.getMonth(), 1);
    prevDateStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  }

  const prevWhere: Record<string, unknown> = {
    fechaSolicitud: { gte: prevDateStart, lt: prevDateEnd },
  };
  if (filtros?.plantel && filtros.plantel !== "todos") {
    prevWhere.plantel = { nombre: filtros.plantel };
  }
  if (filtros?.institucion && filtros.institucion !== "todos") {
    prevWhere.institucion = { nombre: filtros.institucion };
  }

  const prevPromedios = await prisma.encuestaSatisfaccion.aggregate({
    where: { solicitud: prevWhere },
    _avg: {
      puntualidad: true,
      calidadTecnica: true,
      atencionStaff: true,
      satisfaccionGral: true,
    },
    _count: { id: true },
  });

  const currentGlobalAvg = (
    promediosFormateados.puntualidad +
    promediosFormateados.calidadTecnica +
    promediosFormateados.atencionStaff +
    promediosFormateados.satisfaccionGral
  ) / 4;

  const prevGlobalAvg = prevPromedios._count.id > 0
    ? (
        (prevPromedios._avg.puntualidad ?? 0) +
        (prevPromedios._avg.calidadTecnica ?? 0) +
        (prevPromedios._avg.atencionStaff ?? 0) +
        (prevPromedios._avg.satisfaccionGral ?? 0)
      ) / 4
    : 0;

  const variacionCSAT = {
    actual: Number(currentGlobalAvg.toFixed(2)),
    anterior: Number(prevGlobalAvg.toFixed(2)),
    diferencia: Number((currentGlobalAvg - prevGlobalAvg).toFixed(2)),
  };

  // ── 7. CSAT: DIAGNÓSTICO AUTOMÁTICO ──
  let nivel: string, mensaje: string, color: string;
  if (currentGlobalAvg >= 4.5) {
    nivel = 'Excelente';
    mensaje = 'La calidad del servicio supera las expectativas. Se mantiene un nivel óptimo de satisfacción.';
    color = '#16A34A';
  } else if (currentGlobalAvg >= 3.5) {
    nivel = 'Bueno';
    mensaje = 'El servicio es satisfactorio. Existen oportunidades menores de mejora en algunos aspectos.';
    color = '#2563EB';
  } else if (currentGlobalAvg >= 2.5) {
    nivel = 'Aceptable';
    mensaje = 'El servicio cumple con lo mínimo esperado. Se recomienda implementar mejoras puntuales.';
    color = '#F59E0B';
  } else if (currentGlobalAvg >= 1.5) {
    nivel = 'Deficiente';
    mensaje = 'El servicio presenta deficiencias notables. Se requiere una revisión profunda de los procesos.';
    color = '#F97316';
  } else {
    nivel = 'Crítico';
    mensaje = 'El servicio no cumple con los estándares mínimos de calidad. Se necesita una intervención inmediata.';
    color = '#DC2626';
  }

  const diagnostico = { nivel, mensaje, color };

  return {
    totalSolicitudes,
    pendientes,
    aprobadas,
    completadas,
    canceladas,
    porPlantel,
    porInstitucion,
    porMaterial,
    porMes,
    tendencias,
    insights,
    promediosEncuesta: promediosFormateados,
    diagnostico,
    variacionCSAT,
    distribucionEstrellas,
  };
}

/*
 * ── 6. RECOMENDACIONES DE ÍNDICES PostgreSQL ──
 *
 * Los siguientes índices mejoran significativamente el rendimiento de las consultas
 * agregadas (groupBy, COUNT, $queryRaw) que filtran por rango de fechas, estado,
 * plantel o institución. Se proporcionan como referencia para ejecución manual
 * por parte del DBA. NO se ejecutan automáticamente.
 *
 *   CREATE INDEX IF NOT EXISTS idx_solicitud_fecha
 *   ON solicitudes_eventos(fecha_solicitud);
 *
 *   CREATE INDEX IF NOT EXISTS idx_solicitud_estado
 *   ON solicitudes_eventos(estado);
 *
 *   CREATE INDEX IF NOT EXISTS idx_solicitud_plantel
 *   ON solicitudes_eventos(plantel_id);
 *
 *   CREATE INDEX IF NOT EXISTS idx_solicitud_institucion
 *   ON solicitudes_eventos(institucion_id);
 *
 * Explicación:
 * - idx_solicitud_fecha: Acelera los filtros por rango de fechas en tendencias,
 *   historial mensual y contadores.
 * - idx_solicitud_estado: Acelera los GROUP BY por estado en contadores y
 *   tendencias.
 * - idx_solicitud_plantel / idx_solicitud_institucion: Aceleran los filtros
 *   relacionales por plantel e institución.
 *
 * Resumen de optimizaciones aplicadas:
 * - Contadores por estado: 5 COUNT → 1 groupBy  (80% menos consultas)
 * - Tendencias mensuales: 10 COUNT → 2 groupBy  (80% menos consultas)
 * - Historial mensual: findMany + JS → $queryRaw con GROUP BY nativo
 *   (evita transferir fechas al backend, reduce memoria y tiempo de CPU)
 * - Todas las consultas independientes mantienen paralelismo con Promise.all
 */
