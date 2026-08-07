import type { Measurement } from "../api/measurementApi";

type MetricKey =
  | "distributionFlow"
  | "distributionTotal"
  | "transmissionFlow"
  | "transmissionTotal";
type ReportRow = Partial<Record<MetricKey, Measurement>> & { fetchedAt: Date };

const jakartaDateTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jakarta",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
});

function toJakartaExcelDate(date: Date): Date {
  const parts = Object.fromEntries(
    jakartaDateTime
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );
  return new Date(
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
    ),
  );
}

function classifyTag(tagName: string): MetricKey | null {
  const name = tagName.toLowerCase();
  const distribution =
    name.includes("distribusi") || name.includes("distribution");
  const transmission =
    name.includes("transmisi") || name.includes("transmission");
  const totalizer = name.includes("totalizer");
  const flow = name.includes("flow");
  if (distribution && totalizer) return "distributionTotal";
  if (distribution && flow) return "distributionFlow";
  if (transmission && totalizer) return "transmissionTotal";
  if (transmission && flow) return "transmissionFlow";
  return null;
}

function reportRows(measurements: Measurement[]): ReportRow[] {
  const rows: ReportRow[] = [];
  let current: ReportRow | null = null;
  for (const measurement of measurements) {
    const metric = classifyTag(measurement.tagName);
    if (!metric) continue;
    const fetchedAt = new Date(measurement.fetchedAt);
    if (!current || current[metric]) {
      if (current) rows.push(current);
      current = { fetchedAt };
    }
    current[metric] = measurement;
    if (fetchedAt > current.fetchedAt) current.fetchedAt = fetchedAt;
  }
  if (current) rows.push(current);
  return rows;
}

function safeSheetName(name: string, usedNames: Set<string>) {
  const base =
    name
      .replace(/[\\/*?:[\]]/g, " ")
      .trim()
      .slice(0, 31) || "Site";
  let result = base;
  let suffix = 2;
  while (usedNames.has(result)) {
    const ending = ` ${suffix++}`;
    result = `${base.slice(0, 31 - ending.length)}${ending}`;
  }
  usedNames.add(result);
  return result;
}

export async function exportMeasurementsExcel(
  measurements: Measurement[],
  selectedDate: string,
) {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "FlowOps Control Center";
  workbook.created = new Date();
  const sites = new Map<string, Measurement[]>();
  for (const measurement of measurements)
    sites.set(measurement.plcName, [
      ...(sites.get(measurement.plcName) ?? []),
      measurement,
    ]);
  const usedNames = new Set<string>();

  for (const [siteName, siteMeasurements] of sites) {
    const worksheet = workbook.addWorksheet(
      safeSheetName(siteName, usedNames),
      {
        views: [{ state: "frozen", ySplit: 2 }],
        pageSetup: {
          orientation: "landscape",
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0,
        },
      },
    );
    worksheet.columns = [
      { width: 14 },
      { width: 14 },
      { width: 14 },
      { width: 24 },
      { width: 18 },
      { width: 18 },
      { width: 18 },
      { width: 18 },
    ];
    worksheet.mergeCells("A1:A2");
    worksheet.mergeCells("B1:B2");
    worksheet.mergeCells("C1:C2");
    worksheet.mergeCells("D1:D2");
    worksheet.mergeCells("E1:F1");
    worksheet.mergeCells("G1:H1");
    worksheet.getCell("A1").value = "Day";
    worksheet.getCell("B1").value = "Date";
    worksheet.getCell("C1").value = "Time";
    worksheet.getCell("D1").value = "Fetched Time";
    worksheet.getCell("E1").value = "Distribusi";
    worksheet.getCell("G1").value = "Transmisi";
    worksheet.getCell("E2").value = "Flowrate (L/s)";
    worksheet.getCell("F2").value = "Totalizer (m³)";
    worksheet.getCell("G2").value = "Flowrate (L/s)";
    worksheet.getCell("H2").value = "Totalizer (m³)";

    for (const row of reportRows(siteMeasurements)) {
      const excelDate = toJakartaExcelDate(row.fetchedAt);
      worksheet.addRow([
        row.fetchedAt.toLocaleDateString("id-ID", {
          weekday: "long",
          timeZone: "Asia/Jakarta",
        }),
        excelDate,
        excelDate,
        excelDate,
        row.distributionFlow?.value_number ?? null,
        row.distributionTotal?.value_number ?? null,
        row.transmissionFlow?.value_number ?? null,
        row.transmissionTotal?.value_number ?? null,
      ]);
    }

    const darkBlue = "FFBDD7EE";
    const lightBlue = "FFDDEBF7";
    const peach = "FFFCE4D6";
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(2).font = { bold: true };
    worksheet.getRows(1, 2)?.forEach((row) => {
      row.height = 22;
      row.alignment = { horizontal: "center", vertical: "middle" };
    });
    ["A1", "B1", "C1", "D1"].forEach((cell) => {
      worksheet.getCell(cell).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFF2F2F2" },
      };
    });
    worksheet.getCell("E1").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: darkBlue },
    };
    worksheet.getCell("F1").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: darkBlue },
    };
    worksheet.getCell("G1").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: peach },
    };
    worksheet.getCell("H1").fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: peach },
    };
    ["E2", "F2"].forEach((cell) => {
      worksheet.getCell(cell).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: lightBlue },
      };
    });
    ["G2", "H2"].forEach((cell) => {
      worksheet.getCell(cell).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: peach },
      };
    });
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
        cell.border = {
          top: { style: "thin", color: { argb: "FF000000" } },
          left: { style: "thin", color: { argb: "FF000000" } },
          bottom: { style: "thin", color: { argb: "FF000000" } },
          right: { style: "thin", color: { argb: "FF000000" } },
        };
        if (rowNumber > 2) {
          if (columnNumber === 2) cell.numFmt = "yyyy-mm-dd";
          if (columnNumber === 3) cell.numFmt = "hh:mm:ss";
          if (columnNumber === 4) cell.numFmt = "yyyy-mm-dd hh:mm:ss";
          if (columnNumber >= 5) cell.numFmt = "#,##0.00";
          if (columnNumber === 5 || columnNumber === 6)
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: lightBlue },
            };
          if (columnNumber === 7 || columnNumber === 8)
            cell.fill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: peach },
            };
        }
      });
    });
    worksheet.autoFilter = { from: "A2", to: "H2" };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([buffer as ArrayBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `helios-report-${selectedDate}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}
