import prisma from "../config/db.js";
import { Prisma } from "../generated/prisma/client.js";
import type { Estado } from "../generated/prisma/client.js";
import type { FiltrosEstadisticas, DashboardEstadisticas, InsightsData, EntidadLider, MesMasActivo, TendenciaGeneral } from "../types/estadisticas.js";

/**
 * Convierte un par de strings ISO (fechaInicio/fechaFin) a objetos `Date` UTC
 * que Prisma traduce correctamente contra columnas `@db.Date` de PostgreSQL,
 * evitando desfases de zona horaria.
 *
 * Razonamiento matemático (fundamental para entender por qué funciona):
 *
 *   Dado que `@db.Date` es un tipo `date` puro en PostgreSQL (sin componente
 *   horario), Prisma serializa los objetos `Date` de JavaScript extrayendo
 *   únicamente la parte UTC del calendario (año-mes-día). Por lo tanto:
 *
 *   - `new Date("2026-08-05T00:00:00.000Z")` se serializa como `'2026-08-05'`
 *      en SQL, que es exactamente la fecha buscada.
 *   - Si en lugar de `T00:00:00.000Z` usáramos `T00:00:00.000-06:00` (CST),
 *      JavaScript lo convertiría internamente a `2026-08-05T06:00:00.000Z`
 *      (medianoche en México son 6 a. m. UTC), y PostgreSQL interpretaría
 *      la parte UTC `2026-08-05` — misma fecha, mismo resultado.
 *   - El caso peligroso es cuando el desarrollador usa `new Date("2026-08-05")`
 *     (sin hora ni zona). JavaScript lo interpreta como medianoche UTC **en
 *     algunos motores** o como medianoche hora local en otros, causando
 *     resultados inconsistentes entre entornos.
 *   - Al forzar explícitamente `T00:00:00.000Z` eliminamos toda ambigüedad:
 *     JavaScript parsea como UTC fijo y PostgreSQL extrae la fecha UTC,
 *     dando un mapeo biyectivo perfecto sin desfases.
 *
 * Para el límite superior (`fechaFin`) se usa `T23:59:59.999Z`, que cubre
 * inclusive todo el día de la fecha final en UTC.
 *
 * @param fechaInicio - String ISO opcional para el límite inferior (inclusive).
 *   Se trunca a YYYY-MM-DD y se fuerza a medianoche UTC.
 * @param fechaFin    - String ISO opcional para el límite superior (inclusive).
 *   Se trunca a YYYY-MM-DD y se fuerza a 23:59:59.999 UTC.
 *
 * @returns Objeto con propiedades `gte` y/o `lte` tipadas como `Date`, listo
 *   para propagarse a un filtro `where` de Prisma.
 */
function dateRangeMexico(fechaInicio?: string, fechaFin?: string): { gte?: Date; lte?: Date } {
  const filter: { gte?: Date; lte?: Date } = {};
  if (fechaInicio) {
    const startStr = String(fechaInicio).split('T')[0];
    filter.gte = new Date(`${startStr}T00:00:00.000Z`);
  }
  if (fechaFin) {
    const endStr = String(fechaFin).split('T')[0];
    filter.lte = new Date(`${endStr}T23:59:59.999Z`);
  }
  return filter;
}

/**
 * Envuelve `dateRangeMexico` en la estructura anidada que Prisma espera para
 * filtros relacionales ( `{ fechaEvento: { gte: ..., lte: ... } }` ).
 *
 * Si no hay filtros de fecha, retorna `{}` para que el llamador pueda
 * propagarlo sin condiciones adicionales.
 *
 * @param fechaInicio - Límite inferior opcional (se pasa a `dateRangeMexico`).
 * @param fechaFin    - Límite superior opcional (se pasa a `dateRangeMexico`).
 *
 * @returns Objeto `where` parcial para Prisma, listo para combinar con
 *   otros filtros via spread.
 */
function buildDateFilter(fechaInicio?: string, fechaFin?: string): Record<string, unknown> {
  const filter = dateRangeMexico(fechaInicio, fechaFin);
  return Object.keys(filter).length > 0 ? { fechaEvento: filter } : {};
}

/**
 * Obtiene todas las métricas del dashboard: contadores por estado, distribución
 * por plantel/institución/material, historial mensual, tendencias intermensuales,
 * insights estratégicos, promedios CSAT con diagnóstico automático y variación
 * contra el periodo anterior.
 *
 * Lógica interna y optimizaciones:
 *
 * 1. **Contadores por estado** (líneas 50–63):
 *    Un solo `groupBy` reemplaza 5 consultas `COUNT` individuales (una por
 *    estado). La base de datos agrupa y cuenta simultáneamente todos los
 *    grupos en una única consulta.
 *
 * 2. **Historial mensual** (líneas 124–205):
 *    `$queryRaw` con `GROUP BY EXTRACT(YEAR/MONTH ...)` reemplaza un `findMany`
 *    masivo seguido de agrupación en JavaScript. Evita transferir miles de filas
 *    al servidor Node.js, reduciendo memoria y tiempo de CPU. Las condiciones
 *    SQL se construyen con `Prisma.sql` y `Prisma.join` para conservar la
 *    seguridad contra inyección SQL mediante parámetros tipados.
 *
 * 3. **Tendencias intermensuales** (líneas 251–302):
 *    Dos `groupBy` (mes actual + mes anterior) reemplazan 10 consultas COUNT
 *    (5 por cada mes). Solo se ejecutan cuando no hay filtros de rango de
 *    fechas, ya que con filtros arbitrarios la comparación mes contra mes
 *    pierde sentido semántico. La variación porcentual se calcula con
 *    `(actual - anterior) / anterior * 100`; si el periodo anterior es 0,
 *    se retorna 100 % (crecimiento desde la nada).
 *
 * 4. **Promedios CSAT** (líneas 352–358 y 372–435):
 *    Se usa `_avg` nativo de Prisma. Todos los accesos a `_avg.*` implementan
 *    el operador `??` (nullish coalescing) para que, cuando la base de datos
 *    devuelva `null` (no hay encuestas), el frontend reciba `0` en lugar de
 *    `null`, evitando errores de renderizado como `Cannot read properties of
 *    null`.
 *
 * 5. **Distribución de estrellas** (líneas 367–370):
 *    Se fuerza el array `[5, 4, 3, 2, 1]` con `found?._count ?? 0` para
 *    garantizar que siempre se emitan 5 posiciones incluso si algún nivel
 *    de satisfacción no tiene registros.
 *
 * 6. **CSAT vs periodo anterior** (líneas 389–413):
 *    Calcula la longitud exacta del periodo actual filtrado (o del último mes
 *    natural si no hay filtros) y retrocede esa misma longitud para obtener
 *    un periodo comparable estadísticamente, usando `prevDateStart` y
 *    `prevDateEnd`.
 *
 * 7. **Diagnóstico automático** (líneas 438–461):
 *    Clasifica el promedio global CSAT en 5 niveles (Excelente, Bueno,
 *    Aceptable, Deficiente, Crítico) con umbrales fijos, generando un
 *    mensaje descriptivo y un color asociado para visualización en el
 *    frontend.
 *
 * @param filtros - Filtros opcionales de tipo `FiltrosEstadisticas`:
 *   - `fechaInicio` / `fechaFin`: rango de fechas para filtrar solicitudes.
 *   - `plantel`: nombre del plantel para filtrar (o `"todos"`).
 *   - `institucion`: nombre de la institución para filtrar (o `"todos"`).
 *   - `rol`: rol del usuario (`'ADMIN'` o `'USUARIO'`). Los usuarios no-admin
 *     solo ven sus propias solicitudes cuando no se especifica `usuarioId`.
 *   - `usuarioId`: ID del usuario para filtrar solicitudes propias.
 *
 * @returns {Promise<DashboardEstadisticas>} Objeto completo con:
 *   - `totalSolicitudes`, `pendientes`, `aprobadas`, `completadas`, `canceladas`
 *   - `porPlantel`, `porInstitucion`, `porMaterial`, `porMes`
 *   - `tendencias` (variación porcentual mes actual vs anterior)
 *   - `insights` (plantel líder, institución líder, mes más activo, tasas)
 *   - `promediosEncuesta` (puntualidad, calidadTécnica, atenciónStaff,
 *     satisfacciónGral + totalEncuestas)
 *   - `diagnostico` (nivel, mensaje, color)
 *   - `variacionCSAT` (actual, anterior, diferencia)
 *   - `distribucionEstrellas` (conteo de encuestas por estrella 1‑5)
 *
 * @throws {Error} Si Prisma lanza una excepción de conexión o consulta
 *   inválida. Dado que todas las consultas se ejecutan dentro de
 *   `Promise.all`, cualquier error individual propaga el rechazo de toda
 *   la promesa agregada. El llamador debe manejar el error con try-catch
 *   y retornar una respuesta HTTP 500.
 */
export async function obtenerDashboardEstadisticas(filtros?: FiltrosEstadisticas): Promise<DashboardEstadisticas> {
  const dateWhere = buildDateFilter(filtros?.fechaInicio, filtros?.fechaFin);

  const baseWhere: Record<string, unknown> = { ...dateWhere };

  if (filtros?.plantel && filtros.plantel !== "todos") {
    baseWhere.plantel = { nombre: filtros.plantel };
  }
  if (filtros?.institucion && filtros.institucion !== "todos") {
    baseWhere.institucion = { nombre: filtros.institucion };
  }

  // ── FILTRO POR ROL ──
  const esAdmin = filtros?.rol === 'ADMIN';
  const solicitudWhereEncuesta: Record<string, unknown> = {
    ...baseWhere,
    ...(!esAdmin && filtros?.usuarioId ? { usuarioId: filtros.usuarioId } : {}),
  };

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
    const startStr = String(filtros.fechaInicio).split('T')[0];
    startDate = new Date(new Date(`${startStr}T00:00:00.000-06:00`).toISOString());
  } else {
    startDate = new Date(today.getFullYear(), today.getMonth() - 11, 1);
  }

  if (filtros?.fechaFin) {
    const endStr = String(filtros.fechaFin).split('T')[0];
    endDate = new Date(new Date(`${endStr}T23:59:59.999-06:00`).toISOString());
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
    Prisma.sql`se.fecha_evento >= ${new Date(startDate.getFullYear(), startDate.getMonth(), 1)}::date`,
  );
  sqlConditions.push(
    Prisma.sql`se.fecha_evento < ${new Date(endDate.getFullYear(), endDate.getMonth() + 1, 1)}::date`,
  );

  // Filtro adicional por fecha de inicio (si es más restrictivo que el rango mensual)
  if (filtros?.fechaInicio) {
    const startStr = String(filtros.fechaInicio).split('T')[0];
    sqlConditions.push(Prisma.sql`se.fecha_evento >= ${new Date(`${startStr}T00:00:00.000Z`)}::date`);
  }

  // Filtro adicional por fecha de fin (si es más restrictivo que el rango mensual)
  if (filtros?.fechaFin) {
    const endStr = String(filtros.fechaFin).split('T')[0];
    sqlConditions.push(Prisma.sql`se.fecha_evento <= ${new Date(`${endStr}T23:59:59.999Z`)}::date`);
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
        EXTRACT(YEAR FROM se.fecha_evento)::int AS año,
        EXTRACT(MONTH FROM se.fecha_evento)::int AS mes_num,
        COUNT(*)::int AS total
      FROM solicitudes_eventos se
      LEFT JOIN planteles p ON se.plantel_id = p.id
      LEFT JOIN instituciones i ON se.institucion_id = i.id
      WHERE ${whereSQL}
      GROUP BY EXTRACT(YEAR FROM se.fecha_evento), EXTRACT(MONTH FROM se.fecha_evento)
      ORDER BY MIN(se.fecha_evento) ASC
    `,

    prisma.encuestaSatisfaccion.aggregate({
      where: { solicitud: solicitudWhereEncuesta },
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
          fechaEvento: { gte: startOfCurrentMonth, lt: startOfNextMonth } as const,
        },
        _count: true,
      }),
      prisma.solicitudEvento.groupBy({
        by: ["estado"],
        where: {
          ...baseWhere,
          fechaEvento: { gte: startOfPreviousMonth, lt: startOfCurrentMonth } as const,
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
    where: { solicitud: solicitudWhereEncuesta },
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
    const startStr = String(filtros.fechaInicio).split('T')[0];
    const endStr = filtros.fechaFin ? String(filtros.fechaFin).split('T')[0] : '';
    const currentStart = new Date(`${startStr}T00:00:00.000Z`);
    const currentEnd = filtros.fechaFin ? new Date(`${endStr}T23:59:59.999Z`) : new Date();
    const periodLen = currentEnd.getTime() - currentStart.getTime();
    prevDateEnd = new Date(currentStart);
    prevDateStart = new Date(prevDateEnd.getTime() - periodLen);
  } else {
    prevDateEnd = new Date(today.getFullYear(), today.getMonth(), 1);
    prevDateStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  }

  const prevWhere: Record<string, unknown> = {
    fechaEvento: { gte: prevDateStart, lt: prevDateEnd },
  };
  if (filtros?.plantel && filtros.plantel !== "todos") {
    prevWhere.plantel = { nombre: filtros.plantel };
  }
  if (filtros?.institucion && filtros.institucion !== "todos") {
    prevWhere.institucion = { nombre: filtros.institucion };
  }

  const prevSolicitudWhereEncuesta: Record<string, unknown> = {
    ...prevWhere,
    ...(!esAdmin && filtros?.usuarioId ? { usuarioId: filtros.usuarioId } : {}),
  };

  const prevPromedios = await prisma.encuestaSatisfaccion.aggregate({
    where: { solicitud: prevSolicitudWhereEncuesta },
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
