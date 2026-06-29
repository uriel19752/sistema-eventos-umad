import type { Request, Response } from "express";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import { obtenerDashboardEstadisticas } from "../services/estadisticas.service.js";
import type { DashboardEstadisticas } from "../types/estadisticas.js";

const AZUL = "#1E3A8A";
const ROJO = "#E11D48";
const VERDE = "#16A34A";
const AMARILLO = "#F59E0B";
const AZUL_CLARO = "#3B82F6";
const BLANCO = "#FFFFFF";

const chartCanvas = new ChartJSNodeCanvas({
  width: 600,
  height: 340,
  backgroundColour: BLANCO,
});

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildFilterString(
  plantel?: string,
  institucion?: string,
  fechaInicio?: string,
  fechaFin?: string,
): string | null {
  const parts: string[] = [];
  if (plantel) parts.push(`Plantel: ${plantel}`);
  if (institucion) parts.push(`Institución: ${institucion}`);
  if (fechaInicio) parts.push(`Desde: ${fechaInicio}`);
  if (fechaFin) parts.push(`Hasta: ${fechaFin}`);
  return parts.length > 0 ? parts.join(" | ") : null;
}

async function renderBarChart(
  labels: string[],
  values: number[],
): Promise<Buffer> {
  return chartCanvas.renderToBuffer({
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Solicitudes",
          data: values,
          backgroundColor: AZUL,
          borderRadius: 4,
          barPercentage: 0.65,
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: "Solicitudes por Mes",
          color: AZUL,
          font: { size: 16, weight: "bold" },
          padding: { bottom: 16 },
        },
      },
      scales: {
        x: {
          ticks: { color: "#475569", font: { size: 11 } },
          grid: { display: false },
        },
        y: {
          ticks: {
            color: "#475569",
            font: { size: 11 },
            stepSize: 1,
          },
          grid: { color: "#E2E8F0" },
          beginAtZero: true,
        },
      },
    },
  });
}

async function renderPieChart(): Promise<Buffer> {
  return chartCanvas.renderToBuffer({
    type: "pie",
    data: {
      labels: ["Pendientes", "Aprobadas", "Completadas", "Canceladas"],
      datasets: [
        {
          data: [0, 0, 0, 0],
          backgroundColor: [AMARILLO, VERDE, AZUL_CLARO, ROJO],
          borderColor: BLANCO,
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#334155",
            font: { size: 12 },
            padding: 14,
            usePointStyle: true,
            pointStyle: "circle",
          },
        },
        title: {
          display: true,
          text: "Distribución de Estados",
          color: AZUL,
          font: { size: 16, weight: "bold" },
          padding: { bottom: 12 },
        },
      },
    },
  });
}

// ────────────────────────────────────────────────────────────
//  PDF
// ────────────────────────────────────────────────────────────

export async function exportarPDF(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { plantel, institucion, fechaInicio, fechaFin } = req.query as Record<
      string,
      string | undefined
    >;

    const data = await obtenerDashboardEstadisticas({
      ...(plantel ? { plantel } : {}),
      ...(institucion ? { institucion } : {}),
      ...(fechaInicio ? { fechaInicio } : {}),
      ...(fechaFin ? { fechaFin } : {}),
    });

    const doc = new PDFDocument({ margin: 50, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="TigreTrack_Reporte.pdf"',
    );

    doc.pipe(res);

    // ════════════════════════════════════════════════════════
    //  PORTADA EJECUTIVA
    // ════════════════════════════════════════════════════════

    doc.fontSize(28).fillColor(AZUL).text("TigreTrack", { align: "center" });
    doc
      .fontSize(16)
      .fillColor("#475569")
      .text("Reporte Ejecutivo de Estadísticas", { align: "center" });
    doc.moveDown(0.6);

    doc
      .moveTo(150, doc.y)
      .lineTo(445, doc.y)
      .strokeColor(AZUL)
      .lineWidth(2)
      .stroke();
    doc.moveDown(1);

    doc
      .fontSize(10)
      .fillColor("#64748B")
      .text(`Generado el ${formatDateTime(new Date().toISOString())}`, {
        align: "center",
      });
    doc.moveDown(0.3);

    const filtroStr = buildFilterString(plantel, institucion, fechaInicio, fechaFin);
    if (filtroStr) {
      doc
        .fontSize(9)
        .fillColor("#94A3B8")
        .text(`Filtros aplicados: ${filtroStr}`, { align: "center" });
      doc.moveDown(1.2);
    } else {
      doc.moveDown(1);
    }

    doc
      .fontSize(9)
      .fillColor("#94A3B8")
      .text(
        "Sistema de gestión y seguimiento de solicitudes de cobertura " +
          "informativa de la Universidad Madero (UMAD). " +
          "Este reporte consolida las métricas operativas del módulo de estadísticas.",
        { align: "center", width: 400 },
      );

    doc.moveDown(2.5);

    // KPI cards
    const kpis = [
      { label: "Total Solicitudes", value: data.totalSolicitudes, color: AZUL },
      { label: "Pendientes", value: data.pendientes, color: AMARILLO },
      { label: "Aprobadas", value: data.aprobadas, color: VERDE },
      { label: "Completadas", value: data.completadas, color: AZUL_CLARO },
      { label: "Canceladas", value: data.canceladas, color: ROJO },
    ];

    const cardW = 82;
    const cardH = 64;
    const gap = 12;
    const totalW = kpis.length * cardW + (kpis.length - 1) * gap;
    const startXCard =
      (doc.page.width -
        doc.page.margins.left -
        doc.page.margins.right -
        totalW) /
        2 +
      doc.page.margins.left;

    kpis.forEach((kpi, i) => {
      const cx = startXCard + i * (cardW + gap);
      const cy = doc.y;
      doc.roundedRect(cx, cy, cardW, cardH, 8).fill(kpi.color);
      doc
        .fontSize(22)
        .fillColor(BLANCO)
        .text(String(kpi.value), cx, cy + 8, {
          width: cardW,
          align: "center",
        });
      doc
        .fontSize(7)
        .fillColor(BLANCO)
        .text(kpi.label.toUpperCase(), cx, cy + cardH - 18, {
          width: cardW,
          align: "center",
        });
    });

    doc.y += cardH + 30;

    // ════════════════════════════════════════════════════════
    //  RESUMEN EJECUTIVO
    // ════════════════════════════════════════════════════════

    const { tendenciaGeneral, plantelLider, institucionLider, mesMasActivo, tasaCancelacion } = data.insights

    let cuerpoResumen = ''
    if (tendenciaGeneral.tipo === 'crecimiento') {
      cuerpoResumen = `Se observa una tendencia positiva del ${tendenciaGeneral.porcentaje}% respecto al mes anterior. ${mesMasActivo.nombre} fue el periodo con mayor actividad registrada. ${institucionLider.nombre} concentra la mayor demanda institucional, mientras que ${plantelLider.nombre} lidera la operación logística.`
    } else if (tendenciaGeneral.tipo === 'decrecimiento') {
      cuerpoResumen = `Se registra una disminución del ${Math.abs(tendenciaGeneral.porcentaje)}% respecto al mes anterior. A pesar de ello, ${mesMasActivo.nombre} continúa siendo el periodo de mayor actividad y ${plantelLider.nombre} mantiene el liderazgo operativo.`
    } else {
      cuerpoResumen = `La operación se mantiene estable respecto al periodo anterior. ${mesMasActivo.nombre} presenta la mayor actividad registrada y ${institucionLider.nombre} concentra la mayor participación institucional.`
    }

    let resumenFinal = cuerpoResumen

    if (tasaCancelacion < 10) {
      resumenFinal += ' La tasa de cancelación se mantiene dentro de parámetros óptimos.'
    } else {
      resumenFinal += ' La tasa de cancelación requiere seguimiento para identificar oportunidades de mejora.'
    }

    if (tasaCancelacion > 20) {
      resumenFinal += ' Se recomienda revisar el proceso de validación y seguimiento de solicitudes.'
    }
    if (tendenciaGeneral.porcentaje > 100) {
      resumenFinal += ' El crecimiento acelerado de la demanda podría requerir una ampliación de la capacidad operativa.'
    }

    const boxX = 50
    const boxW = 495
    const padX = 18
    const padY = 16

    const bodyOptions = { width: boxW - 2 * padX, align: 'justify' as const }
    const bodyHeight = doc.heightOfString(resumenFinal, bodyOptions)
    const boxHeight = 24 + bodyHeight + padY * 2 + 2

    const marginBottom = 80
    if (doc.y + boxHeight > doc.page.height - marginBottom) {
      doc.addPage()
    }

    const boxY = doc.y

    doc.roundedRect(boxX, boxY, boxW, boxHeight, 12)
      .fillColor('#F8FAFC').fill()

    doc.roundedRect(boxX, boxY, boxW, boxHeight, 12)
      .lineWidth(1.2)
      .strokeColor('#E2E8F0').stroke()

    doc.fillColor('#1E3A8A')
      .fontSize(13)
      .font('Helvetica-Bold')
      .text('Resumen Ejecutivo', boxX + padX, boxY + padY)

    doc.fillColor('#334155')
      .fontSize(11)
      .font('Helvetica')
      .text(resumenFinal, boxX + padX, boxY + padY + 24, {
        width: boxW - 2 * padX,
        align: 'justify' as const,
      })

    doc.y = boxY + boxHeight + 20

    // ════════════════════════════════════════════════════════
    //  GRÁFICAS
    // ════════════════════════════════════════════════════════

    const mesesLabels = data.porMes.map((m) => m.mes ?? "");
    const mesesValues = data.porMes.map((m) => m.total);

    const [barBuffer, pieBuffer] = await Promise.all([
      renderBarChart(mesesLabels, mesesValues),
      renderPieChart(),
    ]);

    // Re-render pie with actual data (need a fresh buffer with correct values)
    const pieBufferWithData = await chartCanvas.renderToBuffer({
      type: "pie",
      data: {
        labels: ["Pendientes", "Aprobadas", "Completadas", "Canceladas"],
        datasets: [
          {
            data: [
              data.pendientes,
              data.aprobadas,
              data.completadas,
              data.canceladas,
            ],
            backgroundColor: [AMARILLO, VERDE, AZUL_CLARO, ROJO],
            borderColor: BLANCO,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              color: "#334155",
              font: { size: 12 },
              padding: 14,
              usePointStyle: true,
              pointStyle: "circle",
            },
          },
          title: {
            display: true,
            text: "Distribución de Estados",
            color: AZUL,
            font: { size: 16, weight: "bold" },
            padding: { bottom: 12 },
          },
        },
      },
    });

    const espacioNecesario = 250;
    const margenInferior = 80;

    if (doc.y + espacioNecesario > doc.page.height - margenInferior) {
      doc.addPage();
    }

    doc.image(barBuffer, {
      fit: [470, 180],
      align: "center",
    });

    if (doc.y + espacioNecesario > doc.page.height - margenInferior) {
      doc.addPage();
    }

    doc.image(pieBufferWithData, {
      fit: [350, 220],
      align: "center",
    });

    // ════════════════════════════════════════════════════════
    //  NUEVA PÁGINA – TABLAS DE DETALLE
    // ════════════════════════════════════════════════════════

    doc.addPage();

    const col1 = 50;
    const col2 = 450;

    // ── POR PLANTEL ──
    doc
      .fontSize(15)
      .fillColor(AZUL)
      .text("Solicitudes por Plantel");
    doc.moveDown(0.3);

    const tableTop = doc.y;
    doc.fontSize(9).fillColor(ROJO);
    doc.text("Plantel", col1, tableTop, { width: 350 });
    doc.text("Total", col2, tableTop, { width: 80, align: "right" });

    let yRow = tableTop + 16;
    doc
      .moveTo(50, yRow - 4)
      .lineTo(545, yRow - 4)
      .strokeColor("#E2E8F0")
      .stroke();

    doc.fontSize(10).fillColor("#0F172A");
    for (const p of data.porPlantel) {
      doc.text(p.nombre, col1, yRow, { width: 350 });
      doc.text(String(p.total), col2, yRow, { width: 80, align: "right" });
      yRow += 18;
    }

    doc.y = yRow + 8;
    doc
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .strokeColor("#E2E8F0")
      .stroke();
    doc.moveDown(0.6);

    // ── POR INSTITUCIÓN ──
    doc.fontSize(15).fillColor(AZUL).text("Solicitudes por Institución");
    doc.moveDown(0.3);

    const tableTop2 = doc.y;
    doc.fontSize(9).fillColor(ROJO);
    doc.text("Institución", col1, tableTop2, { width: 350 });
    doc.text("Total", col2, tableTop2, { width: 80, align: "right" });

    yRow = tableTop2 + 16;
    doc
      .moveTo(50, yRow - 4)
      .lineTo(545, yRow - 4)
      .strokeColor("#E2E8F0")
      .stroke();

    doc.fontSize(10).fillColor("#0F172A");
    for (const i of data.porInstitucion) {
      doc.text(i.nombre, col1, yRow, { width: 350 });
      doc.text(String(i.total), col2, yRow, { width: 80, align: "right" });
      yRow += 18;
    }

    doc.y = yRow + 8;
    doc
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .strokeColor("#E2E8F0")
      .stroke();
    doc.moveDown(0.6);

    // ── HISTORIAL MENSUAL ──
    doc.fontSize(15).fillColor(AZUL).text("Historial Mensual");
    doc.moveDown(0.3);

    const tableTop3 = doc.y;
    doc.fontSize(9).fillColor(ROJO);
    doc.text("Mes", col1, tableTop3, { width: 300 });
    doc.text("Total", col2 - 50, tableTop3, { width: 80, align: "right" });

    yRow = tableTop3 + 16;
    doc
      .moveTo(50, yRow - 4)
      .lineTo(545, yRow - 4)
      .strokeColor("#E2E8F0")
      .stroke();

    doc.fontSize(10).fillColor("#0F172A");
    for (const m of data.porMes) {
      doc.text(String(m.mes ?? ""), col1, yRow, { width: 300 });
      doc.text(String(m.total), col2 - 50, yRow, {
        width: 80,
        align: "right",
      });
      yRow += 18;
    }

    doc.y = yRow + 8;
    doc
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .strokeColor("#E2E8F0")
      .stroke();
    doc.moveDown(1);

    // ── FOOTER ──
    doc
      .fontSize(8)
      .fillColor("#94A3B8")
      .text("Generado automáticamente por TigreTrack", { align: "center" });

    doc.end();
  } catch (error: any) {
    console.error("Error al exportar PDF:", error);
    res.status(500).json({ error: "Error al generar el PDF" });
  }
}

// ────────────────────────────────────────────────────────────
//  EXCEL
// ────────────────────────────────────────────────────────────

export async function exportarExcel(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const { plantel, institucion, fechaInicio, fechaFin } = req.query as Record<
      string,
      string | undefined
    >;

    const data = await obtenerDashboardEstadisticas({
      ...(plantel ? { plantel } : {}),
      ...(institucion ? { institucion } : {}),
      ...(fechaInicio ? { fechaInicio } : {}),
      ...(fechaFin ? { fechaFin } : {}),
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "TigreTrack";
    workbook.created = new Date();

    const filtroStr = buildFilterString(plantel, institucion, fechaInicio, fechaFin);

    const headerStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, color: { argb: "FFFFFFFF" }, size: 11 },
      fill: {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E3A8A" },
      },
      alignment: { horizontal: "center" as const, vertical: "middle" as const },
      border: {
        top: { style: "thin", color: { argb: "FFCBD5E1" } },
        left: { style: "thin", color: { argb: "FFCBD5E1" } },
        bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
        right: { style: "thin", color: { argb: "FFCBD5E1" } },
      },
    };

    const cellStyle: Partial<ExcelJS.Style> = {
      font: { size: 10, color: { argb: "FF0F172A" } },
      alignment: { horizontal: "center" as const, vertical: "middle" as const },
      border: {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      },
    };

    const titleStyle: Partial<ExcelJS.Style> = {
      font: { bold: true, size: 16, color: { argb: "FF1E3A8A" } },
      alignment: { horizontal: "left" as const, vertical: "middle" as const },
    };

    const subtitleStyle: Partial<ExcelJS.Style> = {
      font: { size: 10, color: { argb: "FF64748B" } },
      alignment: { horizontal: "left" as const, vertical: "middle" as const },
    };

    // ════════════════════════════════════════════════════════
    //  HOJA 1 – DASHBOARD EJECUTIVO
    // ════════════════════════════════════════════════════════
    const sheet0 = workbook.addWorksheet("Dashboard Ejecutivo");

    sheet0.mergeCells("A1:B1");
    const titleCell = sheet0.getCell("A1");
    titleCell.value = "TigreTrack - Reporte Ejecutivo";
    titleCell.style = titleStyle;
    sheet0.getRow(1).height = 30;

    sheet0.mergeCells("A2:B2");
    const dateCell = sheet0.getCell("A2");
    dateCell.value = `Generado el ${formatDateTime(new Date().toISOString())}`;
    dateCell.style = subtitleStyle;

    sheet0.mergeCells("A3:B3");
    const filterCell = sheet0.getCell("A3");
    filterCell.value = filtroStr
      ? `Filtros: ${filtroStr}`
      : "Sin filtros aplicados";
    filterCell.style = subtitleStyle;

    sheet0.getRow(4).height = 8;

    const kpiHeaderRow = sheet0.getRow(5);
    kpiHeaderRow.getCell(1).value = "Métrica";
    kpiHeaderRow.getCell(2).value = "Valor";
    kpiHeaderRow.eachCell((cell) => {
      cell.style = headerStyle;
    });

    const kpiRows = [
      { metrica: "Total Solicitudes", valor: data.totalSolicitudes },
      { metrica: "Pendientes", valor: data.pendientes },
      { metrica: "Aprobadas", valor: data.aprobadas },
      { metrica: "Completadas", valor: data.completadas },
      { metrica: "Canceladas", valor: data.canceladas },
    ];

    kpiRows.forEach((row) => {
      const r = sheet0.addRow([row.metrica, row.valor]);
      r.eachCell((cell) => {
        cell.style = cellStyle;
      });
    });

    sheet0.columns = [
      { key: "metrica", width: 30 },
      { key: "valor", width: 15 },
    ];

    // ════════════════════════════════════════════════════════
    //  HOJA 2 – POR PLANTEL
    // ════════════════════════════════════════════════════════
    const sheet1 = workbook.addWorksheet("Por Plantel");
    sheet1.columns = [
      { header: "Plantel", key: "nombre", width: 35 },
      { header: "Total", key: "total", width: 15 },
    ];

    sheet1.getRow(1).eachCell((cell) => {
      cell.style = headerStyle;
    });

    data.porPlantel.forEach((row) => {
      const r = sheet1.addRow(row);
      r.eachCell((cell) => {
        cell.style = cellStyle;
      });
    });

    sheet1.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: data.porPlantel.length + 1, column: 2 },
    };
    sheet1.views = [{ state: "frozen", ySplit: 1 }];

    // ════════════════════════════════════════════════════════
    //  HOJA 3 – POR INSTITUCIÓN
    // ════════════════════════════════════════════════════════
    const sheet2 = workbook.addWorksheet("Por Institución");
    sheet2.columns = [
      { header: "Institución", key: "nombre", width: 35 },
      { header: "Total", key: "total", width: 15 },
    ];

    sheet2.getRow(1).eachCell((cell) => {
      cell.style = headerStyle;
    });

    data.porInstitucion.forEach((row) => {
      const r = sheet2.addRow(row);
      r.eachCell((cell) => {
        cell.style = cellStyle;
      });
    });

    sheet2.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: data.porInstitucion.length + 1, column: 2 },
    };
    sheet2.views = [{ state: "frozen", ySplit: 1 }];

    // ════════════════════════════════════════════════════════
    //  HOJA 4 – HISTORIAL MENSUAL
    // ════════════════════════════════════════════════════════
    const sheet3 = workbook.addWorksheet("Historial Mensual");
    sheet3.columns = [
      { header: "Mes", key: "mes", width: 20 },
      { header: "Total", key: "total", width: 15 },
    ];

    sheet3.getRow(1).eachCell((cell) => {
      cell.style = headerStyle;
    });

    data.porMes.forEach((row) => {
      const r = sheet3.addRow(row);
      r.eachCell((cell) => {
        cell.style = cellStyle;
      });
    });

    sheet3.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: data.porMes.length + 1, column: 2 },
    };
    sheet3.views = [{ state: "frozen", ySplit: 1 }];

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="TigreTrack_Reporte.xlsx"',
    );

    await workbook.xlsx.write(res);
    return;
  } catch (error: any) {
    console.error("Error al exportar Excel:", error);
    res.status(500).json({ error: "Error al generar el Excel" });
  }
}
