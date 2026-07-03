import type { Request, Response } from "express";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import { ChartJSNodeCanvas } from "chartjs-node-canvas";
import prisma from "../config/db.js";
import { obtenerDashboardEstadisticas } from "../services/estadisticas.service.js";

const chartCanvas = new ChartJSNodeCanvas({
  width: 600,
  height: 340,
  backgroundColour: "#FFFFFF",
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

function renderEstrellas(doc: PDFKit.PDFDocument, rating: number, x: number, y: number, size: number) {
  for (let i = 0; i < 5; i++) {
    const sx = x + i * (size + 4);
    const activa = i < Math.round(rating);
    doc
      .fontSize(size)
      .fillColor(activa ? "#F59E0B" : "#E2E8F0")
      .text("\u2605", sx, y);
  }
}

const AZUL = "#1E3A8A";
const VERDE = "#10B981";
const AMARILLO = "#F59E0B";
const ROJO = "#EF4444";
const ROSA = "#EC4899";
const MORADO = "#8B5CF6";

// ────────────────────────────────────────────────────────────
//  PDF – Reporte de Satisfacción
// ────────────────────────────────────────────────────────────

export async function exportarPDF(req: Request, res: Response): Promise<void> {
  try {
    const { plantel, institucion } = req.query as Record<string, string | undefined>;

    const [dashboard, encuestas] = await Promise.all([
      obtenerDashboardEstadisticas({
        ...(plantel ? { plantel } : {}),
        ...(institucion ? { institucion } : {}),
      }),
      prisma.encuestaSatisfaccion.findMany({
        where: plantel || institucion
          ? {
              solicitud: {
                ...(plantel ? { plantel: { nombre: plantel } } : {}),
                ...(institucion ? { institucion: { nombre: institucion } } : {}),
              },
            }
          : {},
        orderBy: { fechaRespuesta: "desc" },
        include: {
          solicitud: {
            select: { folio: true, nombreEvento: true },
          },
        },
      }),
    ]);

    const p = dashboard.promediosEncuesta;
    const comentarios = encuestas.filter((e) => e.comentarios?.trim());

    const doc = new PDFDocument({ margin: 50, size: "A4" });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="TigreTrack_Reporte_Calidad.pdf"',
    );

    doc.pipe(res);

    // ── PORTADA ──
    doc.fontSize(26).fillColor(AZUL).text("TigreTrack", { align: "center" });
    doc
      .fontSize(14)
      .fillColor("#475569")
      .text("Reporte de Satisfacción y Calidad", { align: "center" });
    doc
      .moveTo(150, doc.y + 6)
      .lineTo(445, doc.y + 6)
      .strokeColor(AZUL)
      .lineWidth(2)
      .stroke();
    doc.moveDown(1.5);
    doc
      .fontSize(10)
      .fillColor("#64748B")
      .text(`Generado el ${formatDateTime(new Date().toISOString())}`, {
        align: "center",
      });
    doc.moveDown(0.3);
    const filtros: string[] = [];
    if (plantel) filtros.push(`Plantel: ${plantel}`);
    if (institucion) filtros.push(`Institución: ${institucion}`);
    if (filtros.length) {
      doc
        .fontSize(9)
        .fillColor("#94A3B8")
        .text(`Filtros: ${filtros.join(" | ")}`, { align: "center" });
    }
    doc.moveDown(2);

    // ── TARJETA DE PROMEDIO GLOBAL ──
    if (p) {
      const cardX = 150;
      const cardY = doc.y;
      const cardW = 295;
      const cardH = 140;

      doc.roundedRect(cardX, cardY, cardW, cardH, 12).fill("#F8FAFC");
      doc
        .roundedRect(cardX, cardY, cardW, cardH, 12)
        .lineWidth(1)
        .stroke("#E2E8F0");

      const pct = (p.satisfaccionGral / 5) * 100;
      const color = pct >= 85 ? VERDE : pct >= 70 ? AMARILLO : ROJO;

      doc
        .fontSize(48)
        .fillColor("#0F172A")
        .text(p.satisfaccionGral.toFixed(1), cardX + 50, cardY + 22, {
          width: 80,
          align: "center",
        });

      renderEstrellas(doc, p.satisfaccionGral, cardX + 50, cardY + 84, 14);

      doc
        .fontSize(12)
        .fillColor(color)
        .text(
          pct >= 85 ? "Excelente" : pct >= 70 ? "Regular" : "Crítico",
          cardX + 160,
          cardY + 30,
          { width: 120 },
        );
      doc
        .fontSize(9)
        .fillColor("#64748B")
        .text(
          `Promedio general basado en ${p.totalEncuestas} evaluaciones`,
          cardX + 160,
          cardY + 52,
          { width: 120 },
        );

      doc
        .fontSize(9)
        .fillColor("#334155")
        .text(`Puntualidad: ${p.puntualidad.toFixed(1)}/5`, cardX + 20, cardY + 110);
      doc
        .fontSize(9)
        .fillColor("#334155")
        .text(`Calidad Técnica: ${p.calidadTecnica.toFixed(1)}/5`, cardX + 120, cardY + 110);
      doc
        .fontSize(9)
        .fillColor("#334155")
        .text(`Atención: ${p.atencionStaff.toFixed(1)}/5`, cardX + 220, cardY + 110);

      doc.y = cardY + cardH + 24;
    }

    // ── MURO DE OPINIONES ──
    doc.moveDown(1);
    doc.fontSize(16).fillColor(AZUL).text("Muro de Opiniones");
    doc.moveDown(0.5);

    if (comentarios.length === 0) {
      doc
        .fontSize(10)
        .fillColor("#94A3B8")
        .text("No hay comentarios escritos registrados.");
    } else {
      for (const e of comentarios) {
        if (doc.y > doc.page.height - 100) doc.addPage();

        const boxY = doc.y;
        doc
          .roundedRect(50, boxY, 495, 68, 8)
          .fillAndStroke("#F8FAFC", "#E2E8F0");
        doc
          .fontSize(8)
          .fillColor("#64748B")
          .text(`${e.solicitud.nombreEvento} — Folio: ${e.solicitud.folio}`, 62, boxY + 8, {
            width: 470,
          });
        renderEstrellas(doc, e.satisfaccionGral, 62, boxY + 24, 10);

        doc
          .fontSize(9)
          .fillColor("#0F172A")
          .text(`"${e.comentarios}"`, 62, boxY + 40, {
            width: 470,
          });

        doc.y = boxY + 80;
      }
    }

    // ── FOOTER ──
    doc.moveDown(2);
    doc
      .fontSize(8)
      .fillColor("#94A3B8")
      .text("Generado automáticamente por TigreTrack", { align: "center" });

    doc.end();
  } catch (error) {
    console.error("Error al exportar PDF de calidad:", error);
    res.status(500).json({ error: "Error al generar el PDF" });
  }
}

// ────────────────────────────────────────────────────────────
//  EXCEL – Reporte de Satisfacción
// ────────────────────────────────────────────────────────────

export async function exportarExcel(req: Request, res: Response): Promise<void> {
  try {
    const { plantel, institucion } = req.query as Record<string, string | undefined>;

    const [dashboard, encuestas] = await Promise.all([
      obtenerDashboardEstadisticas({
        ...(plantel ? { plantel } : {}),
        ...(institucion ? { institucion } : {}),
      }),
      prisma.encuestaSatisfaccion.findMany({
        where: plantel || institucion
          ? {
              solicitud: {
                ...(plantel ? { plantel: { nombre: plantel } } : {}),
                ...(institucion ? { institucion: { nombre: institucion } } : {}),
              },
            }
          : {},
        orderBy: { fechaRespuesta: "desc" },
        include: {
          solicitud: {
            select: { folio: true, nombreEvento: true, fechaEvento: true },
          },
        },
      }),
    ]);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "TigreTrack";
    workbook.created = new Date();

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

    // ════════════════════════════════════════════════════════
    //  HOJA 1 – RESUMEN DE CALIDAD
    // ════════════════════════════════════════════════════════
    const sheet0 = workbook.addWorksheet("Resumen de Calidad");

    sheet0.mergeCells("A1:D1");
    const titleCell = sheet0.getCell("A1");
    titleCell.value = "TigreTrack — Resumen de Calidad";
    titleCell.style = {
      font: { bold: true, size: 16, color: { argb: "FF1E3A8A" } },
      alignment: { horizontal: "left" as const, vertical: "middle" as const },
    };
    sheet0.getRow(1).height = 30;

    sheet0.mergeCells("A2:D2");
    const dateCell = sheet0.getCell("A2");
    dateCell.value = `Generado el ${formatDateTime(new Date().toISOString())}`;
    dateCell.style = {
      font: { size: 10, color: { argb: "FF64748B" } },
      alignment: { horizontal: "left" as const, vertical: "middle" as const },
    };

    sheet0.getRow(3).height = 8;

    // Promedios header
    const promHeader = sheet0.getRow(4);
    promHeader.getCell(1).value = "Indicador";
    promHeader.getCell(2).value = "Promedio";
    promHeader.getCell(3).value = "Calificación";
    promHeader.getCell(4).value = "Estatus";
    promHeader.eachCell((cell) => { cell.style = headerStyle; });

    const p = dashboard.promediosEncuesta;
    if (p) {
      const indicadores = [
        {
          label: "Satisfacción General",
          valor: p.satisfaccionGral,
          color: p.satisfaccionGral >= 4.25 ? VERDE : p.satisfaccionGral >= 3.5 ? AMARILLO : ROJO,
        },
        { label: "Puntualidad", valor: p.puntualidad, color: "#3B82F6" },
        { label: "Calidad Técnica", valor: p.calidadTecnica, color: MORADO },
        { label: "Atención del Staff", valor: p.atencionStaff, color: ROSA },
      ];

      for (const ind of indicadores) {
        const r = sheet0.addRow([
          ind.label,
          ind.valor.toFixed(1),
          `${ind.valor.toFixed(1)} / 5`,
          ind.valor >= 4 ? "Excelente" : ind.valor >= 3 ? "Regular" : "Crítico",
        ]);
        r.eachCell((cell) => { cell.style = cellStyle; });
        r.getCell(2).style = { ...cellStyle, font: { ...cellStyle.font, bold: true, color: { argb: ind.color.replace("#", "FF") } } };
      }
    }

    sheet0.getRow(4 + (p ? Object.keys({ ...p }).length : 0) + 2).height = 8;

    // Incrustar gráfico de barras de los promedios
    if (p) {
      try {
        const imgBuffer = await chartCanvas.renderToBuffer({
          type: "bar",
          data: {
            labels: ["Puntualidad", "Calidad Técnica", "Atención Staff", "Satisfacción Gral"],
            datasets: [
              {
                label: "Promedio / 5",
                data: [p.puntualidad, p.calidadTecnica, p.atencionStaff, p.satisfaccionGral],
                backgroundColor: ["#3B82F6", MORADO, ROSA, VERDE],
                borderRadius: 4,
                barPercentage: 0.6,
              },
            ],
          },
          options: {
            responsive: false,
            plugins: {
              legend: { display: false },
              title: {
                display: true,
                text: "Promedios por Criterio",
                color: AZUL,
                font: { size: 16, weight: "bold" },
                padding: { bottom: 16 },
              },
            },
            scales: {
              y: { min: 0, max: 5, ticks: { stepSize: 1 } },
            },
          },
        });
        const imageId = (workbook.addImage as any)({
          buffer: imgBuffer,
          extension: "png",
        });
        const rowInsert =
          4 + (p ? 5 : 0) + 2;
        sheet0.addImage(imageId, {
          tl: { col: 0, row: rowInsert },
          ext: { width: 600, height: 340 },
        });
      } catch {
        // fail silently if chart rendering fails
      }
    }

    // ════════════════════════════════════════════════════════
    //  HOJA 2 – DETALLE DE ENCUESTAS
    // ════════════════════════════════════════════════════════
    const sheet1 = workbook.addWorksheet("Detalle de Encuestas");
    sheet1.columns = [
      { header: "Folio", key: "folio", width: 18 },
      { header: "Evento", key: "evento", width: 35 },
      { header: "Fecha Evento", key: "fechaEvento", width: 18 },
      { header: "Puntualidad", key: "puntualidad", width: 14 },
      { header: "Calidad Técnica", key: "calidadTecnica", width: 16 },
      { header: "Atención Staff", key: "atencionStaff", width: 16 },
      { header: "Satisfacción Gral", key: "satisfaccionGral", width: 18 },
      { header: "Comentarios", key: "comentarios", width: 45 },
      { header: "Fecha Respuesta", key: "fechaRespuesta", width: 20 },
    ];

    sheet1.getRow(1).eachCell((cell) => { cell.style = headerStyle; });

    encuestas.forEach((e) => {
      const r = sheet1.addRow({
        folio: e.solicitud.folio,
        evento: e.solicitud.nombreEvento,
        fechaEvento: e.solicitud.fechaEvento
          ? formatDate(e.solicitud.fechaEvento.toISOString())
          : "",
        puntualidad: e.puntualidad,
        calidadTecnica: e.calidadTecnica,
        atencionStaff: e.atencionStaff,
        satisfaccionGral: e.satisfaccionGral,
        comentarios: e.comentarios ?? "",
        fechaRespuesta: formatDateTime(e.fechaRespuesta.toISOString()),
      });
      r.eachCell((cell) => { cell.style = cellStyle; });
    });

    sheet1.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: encuestas.length + 1, column: 9 },
    };
    sheet1.views = [{ state: "frozen", ySplit: 1 }];

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="TigreTrack_Reporte_Calidad.xlsx"',
    );

    await workbook.xlsx.write(res);
  } catch (error) {
    console.error("Error al exportar Excel de calidad:", error);
    res.status(500).json({ error: "Error al generar el Excel" });
  }
}
