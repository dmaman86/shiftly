import { jsPDF } from "jspdf";

import notoSansHebrewFontUrl from "../assets/NotoSansHebrew.ttf?url";

type PdfMetadata = {
  header: string;
  footer: string;
  direction?: "ltr" | "rtl";
};

type PdfCell = {
  row: number;
  column: number;
  columnSpan: number;
  rowSpan: number;
  text: string;
  isHeader: boolean;
  widthPx: number;
};

type PdfRow = {
  cells: PdfCell[];
  height: number;
  isLastInWeek: boolean;
};

const PDF_MARGIN = 8;
const PDF_HEADER_HEIGHT = 12;
const PDF_FOOTER_HEIGHT = 8;
const PDF_TITLE_FONT_SIZE = 12;
const PDF_METADATA_FONT_SIZE = 7;
const PDF_TABLE_FONT_SIZE = 6;
const PDF_LINE_HEIGHT = 2.6;
const PDF_CELL_PADDING = 1;
const PDF_WEEK_BORDER_WIDTH = 1;
const PDF_REGULAR_BORDER_WIDTH = 0.2;
const PDF_TABLE_HEADER_COLOR = "#f3f3f3";
const PDF_TEXT_COLOR = "#1d3e91";
const PDF_MUTED_TEXT_COLOR = "#4a4a4a";
const FONT_FILE_NAME = "NotoSansHebrew.ttf";
const FONT_FAMILY = "NotoSansHebrew";
const HEBREW_CHARACTER_PATTERN = /[\u0590-\u05ff]/;

let fontBase64Promise: Promise<string> | undefined;

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }

  return btoa(binary);
};

const loadFontBase64 = () => {
  fontBase64Promise ??= fetch(notoSansHebrewFontUrl)
    .then((response) => {
      if (!response.ok) throw new Error("Could not load the PDF font");
      return response.arrayBuffer();
    })
    .then(arrayBufferToBase64);

  return fontBase64Promise;
};

const normalizeCellText = (cell: HTMLTableCellElement) =>
  (cell.textContent ?? "")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");

const getRows = (table: HTMLTableElement) => [
  ...Array.from(table.tHead?.rows ?? []),
  ...Array.from(table.tBodies).flatMap((body) => Array.from(body.rows)),
  ...Array.from(table.tFoot?.rows ?? []),
];

const extractCells = (table: HTMLTableElement) => {
  const cells: PdfCell[] = [];
  const occupied = new Map<number, Set<number>>();

  getRows(table).forEach((row, rowIndex) => {
    const occupiedColumns = occupied.get(rowIndex) ?? new Set<number>();
    let column = 0;

    for (const cell of Array.from(row.cells)) {
      while (occupiedColumns.has(column)) column += 1;

      const columnSpan = Math.max(cell.colSpan, 1);
      const rowSpan = Math.max(cell.rowSpan, 1);
      cells.push({
        row: rowIndex,
        column,
        columnSpan,
        rowSpan,
        text: normalizeCellText(cell),
        isHeader: row.parentElement?.tagName === "THEAD",
        widthPx: cell.getBoundingClientRect().width,
      });

      for (let spanRow = rowIndex; spanRow < rowIndex + rowSpan; spanRow += 1) {
        const rowColumns = occupied.get(spanRow) ?? new Set<number>();
        for (
          let spanColumn = column;
          spanColumn < column + columnSpan;
          spanColumn += 1
        ) {
          rowColumns.add(spanColumn);
        }
        occupied.set(spanRow, rowColumns);
      }

      column += columnSpan;
    }
  });

  const rowCount = getRows(table).length;
  const columnCount = cells.reduce(
    (maximum, cell) => Math.max(maximum, cell.column + cell.columnSpan),
    0,
  );

  return { cells, columnCount, rowCount };
};

const getColumnWidths = (
  cells: PdfCell[],
  columnCount: number,
  contentWidth: number,
) => {
  const widths = Array.from({ length: columnCount }, () => 0);

  for (const cell of cells) {
    if (cell.columnSpan !== 1) continue;

    widths[cell.column] = Math.max(widths[cell.column], cell.widthPx);
  }

  const measuredWidth = widths.reduce((sum, width) => sum + width, 0);
  if (measuredWidth === 0) {
    return widths.map(() => contentWidth / columnCount);
  }

  return widths.map((width) => (width / measuredWidth) * contentWidth);
};

const getCellWidth = (cell: PdfCell, columnWidths: number[]) =>
  columnWidths
    .slice(cell.column, cell.column + cell.columnSpan)
    .reduce((sum, width) => sum + width, 0);

const getCellLines = (pdf: jsPDF, text: string, width: number) => {
  if (!text) return [];

  return text
    .split("\n")
    .flatMap((line) => pdf.splitTextToSize(line, width - PDF_CELL_PADDING * 2));
};

const getRowHeights = (
  pdf: jsPDF,
  cells: PdfCell[],
  rowCount: number,
  columnWidths: number[],
) => {
  const heights = Array.from({ length: rowCount }, () => PDF_LINE_HEIGHT + 1.6);

  for (const cell of cells) {
    const cellWidth = getCellWidth(cell, columnWidths);
    const lineCount = Math.max(1, getCellLines(pdf, cell.text, cellWidth).length);
    const requiredHeight = lineCount * PDF_LINE_HEIGHT + PDF_CELL_PADDING * 2;
    const heightPerRow = requiredHeight / cell.rowSpan;

    for (
      let row = cell.row;
      row < Math.min(cell.row + cell.rowSpan, rowCount);
      row += 1
    ) {
      heights[row] = Math.max(heights[row], heightPerRow);
    }
  }

  return heights;
};

const setupFont = async (pdf: jsPDF) => {
  const fontBase64 = await loadFontBase64();
  pdf.addFileToVFS(FONT_FILE_NAME, fontBase64);
  pdf.addFont(FONT_FILE_NAME, FONT_FAMILY, "normal");
  pdf.setFont(FONT_FAMILY, "normal");
};

const drawText = (
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  fontSize: number,
) => {
  const lines = getCellLines(pdf, text, width);
  if (lines.length === 0) return;

  // jsPDF's global RTL mode reverses numeric strings as well. Keep pure
  // numeric/time/currency cells LTR while preserving RTL for Hebrew labels.
  pdf.setR2L(HEBREW_CHARACTER_PATTERN.test(text));
  pdf.setFontSize(fontSize);
  const textHeight = lines.length * PDF_LINE_HEIGHT;
  const startY = y + (height - textHeight) / 2 + PDF_LINE_HEIGHT * 0.8;
  pdf.text(lines, x + width / 2, startY, {
    align: "center",
    baseline: "alphabetic",
  });
};

const drawDirectionalText = (
  pdf: jsPDF,
  text: string,
  x: number,
  y: number,
  align: "left" | "right",
  fontSize: number,
) => {
  pdf.setR2L(HEBREW_CHARACTER_PATTERN.test(text));
  pdf.setFontSize(fontSize);
  pdf.text(text, x, y, { align });
};

const drawMixedRtlText = (
  pdf: jsPDF,
  text: string,
  right: number,
  y: number,
  fontSize: number,
) => {
  const runs = text.match(/[\u0590-\u05ff]+|[^\u0590-\u05ff]+/g) ?? [];
  let cursor = right;

  pdf.setFontSize(fontSize);

  for (const run of runs) {
    const isHebrew = HEBREW_CHARACTER_PATTERN.test(run);
    pdf.setR2L(isHebrew);
    const width = pdf.getTextWidth(run);
    pdf.text(run, cursor, y, { align: "right" });
    cursor -= width;
  }
};

const drawRows = ({
  pdf,
  cells,
  rows,
  rowStart,
  rowEnd,
  rowHeights,
  columnWidths,
  originY,
  pageRight,
  rowOffset = 0,
}: {
  pdf: jsPDF;
  cells: PdfCell[];
  rows: PdfRow[];
  rowStart: number;
  rowEnd: number;
  rowHeights: number[];
  columnWidths: number[];
  originY: number;
  pageRight: number;
  rowOffset?: number;
}) => {
  const rowY = new Map<number, number>();
  let y = originY;

  for (let row = rowStart; row < rowEnd; row += 1) {
    rowY.set(row, y);
    y += rowHeights[row];
  }

  for (const cell of cells.filter(
    ({ row }) => row >= rowStart && row < rowEnd,
  )) {
    const width = getCellWidth(cell, columnWidths);
    const height = rowHeights
      .slice(cell.row, Math.min(cell.row + cell.rowSpan, rowEnd))
      .reduce((sum, rowHeight) => sum + rowHeight, 0);
    const cellY = rowY.get(cell.row) ?? originY;
    const rightOffset = columnWidths
      .slice(0, cell.column + cell.columnSpan)
      .reduce((sum, columnWidth) => sum + columnWidth, 0);
    const x = pageRight - rightOffset;

    pdf.setFillColor(cell.isHeader ? PDF_TABLE_HEADER_COLOR : "#ffffff");
    pdf.setDrawColor("#777777");
    pdf.setLineWidth(PDF_REGULAR_BORDER_WIDTH);
    pdf.rect(x, cellY, width, height, "FD");
    pdf.setTextColor(PDF_TEXT_COLOR);
    drawText(
      pdf,
      cell.text,
      x,
      cellY,
      width,
      height,
      cell.isHeader ? PDF_TABLE_FONT_SIZE + 0.3 : PDF_TABLE_FONT_SIZE,
    );
  }

  for (let row = rowStart; row < rowEnd; row += 1) {
    if (!rows[row - rowOffset]?.isLastInWeek) continue;

    const borderY = (rowY.get(row) ?? originY) + rowHeights[row];
    pdf.setDrawColor("#1d3e91");
    pdf.setLineWidth(PDF_WEEK_BORDER_WIDTH);
    pdf.line(
      pageRight - columnWidths.reduce((sum, width) => sum + width, 0),
      borderY,
      pageRight,
      borderY,
    );
  }

  return y;
};

export const exportWorkTablePdf = async ({
  element,
  fileName,
  metadata,
}: {
  element: HTMLElement;
  fileName: string;
  metadata?: PdfMetadata;
}) => {
  const table = element.querySelector("table");
  const title = element.querySelector("h1")?.textContent?.trim() ?? "";
  const metadataHeader = element.querySelector("h1 + div")?.textContent?.trim() ?? "";

  if (!(table instanceof HTMLTableElement)) {
    throw new Error("Could not find the work table for PDF export");
  }

  const pdf = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  await setupFont(pdf);

  const isRtl = metadata?.direction === "rtl";
  pdf.setR2L(isRtl);

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const contentWidth = pageWidth - PDF_MARGIN * 2;
  const pageRight = pageWidth - PDF_MARGIN;
  const contentTop = PDF_MARGIN + PDF_HEADER_HEIGHT;
  const contentBottom = pageHeight - PDF_MARGIN - PDF_FOOTER_HEIGHT;
  const { cells, columnCount, rowCount } = extractCells(table);
  const columnWidths = getColumnWidths(cells, columnCount, contentWidth);
  const rowHeights = getRowHeights(pdf, cells, rowCount, columnWidths);
  const headerRowCount = table.tHead?.rows.length ?? 0;
  const bodyStart = headerRowCount;
  const bodyEnd = rowCount - (table.tFoot?.rows.length ?? 0);
  const bodyCells = cells.filter(({ row }) => row >= bodyStart && row < bodyEnd);
  const headerCells = cells.filter(({ row }) => row < headerRowCount);
  const footerCells = cells.filter(({ row }) => row >= bodyEnd);
  const bodyRows: PdfRow[] = Array.from(
    { length: bodyEnd - bodyStart },
    (_, index) => ({
      cells: bodyCells.filter(({ row }) => row === bodyStart + index),
      height: rowHeights[bodyStart + index],
      isLastInWeek: false,
    }),
  );

  for (const row of bodyRows) {
    row.isLastInWeek = row.cells.some((cell) => {
      const htmlRow = table.rows[cell.row];
      return htmlRow?.dataset.weekEnd === "true";
    });
  }

  const headerHeight = rowHeights
    .slice(0, headerRowCount)
    .reduce((sum, height) => sum + height, 0);
  const footerHeight = rowHeights
    .slice(bodyEnd)
    .reduce((sum, height) => sum + height, 0);
  const bodyPageHeight = contentBottom - contentTop - headerHeight - footerHeight;
  let bodyIndex = 0;
  let page = 0;

  while (bodyIndex < bodyRows.length || page === 0) {
    if (page > 0) pdf.addPage();

    const pageTitle = page === 0 ? title : metadata?.header ?? metadataHeader;
    pdf.setTextColor(PDF_MUTED_TEXT_COLOR);
    drawDirectionalText(
      pdf,
      pageTitle,
      isRtl ? pageRight : PDF_MARGIN,
      PDF_MARGIN + 4,
      isRtl ? "right" : "left",
      page === 0 ? PDF_TITLE_FONT_SIZE : PDF_METADATA_FONT_SIZE,
    );

    if (page === 0 && metadataHeader) {
      drawDirectionalText(
        pdf,
        metadataHeader,
        isRtl ? pageRight : PDF_MARGIN,
        PDF_MARGIN + 8,
        isRtl ? "right" : "left",
        PDF_METADATA_FONT_SIZE,
      );
    }

    drawRows({
      pdf,
      cells: headerCells,
      rows: [],
      rowStart: 0,
      rowEnd: headerRowCount,
      rowHeights,
      columnWidths,
      originY: contentTop,
      pageRight,
    });

    const pageBodyStart = bodyIndex;
    let pageBodyHeight = 0;
    while (
      bodyIndex < bodyRows.length &&
      pageBodyHeight + bodyRows[bodyIndex].height <= bodyPageHeight
    ) {
      pageBodyHeight += bodyRows[bodyIndex].height;
      bodyIndex += 1;
    }

    if (bodyIndex === pageBodyStart && bodyIndex < bodyRows.length) bodyIndex += 1;

    const pageRows = bodyRows.slice(pageBodyStart, bodyIndex);
    drawRows({
      pdf,
      cells: pageRows.flatMap(({ cells: rowCells }) => rowCells),
      rows: bodyRows,
      rowStart: bodyStart + pageBodyStart,
      rowEnd: bodyStart + bodyIndex,
      rowHeights,
      columnWidths,
      originY: contentTop + headerHeight,
      pageRight,
      rowOffset: bodyStart,
    });

    if (bodyIndex === bodyRows.length) {
      drawRows({
        pdf,
        cells: footerCells,
        rows: [],
        rowStart: bodyEnd,
        rowEnd: rowCount,
        rowHeights,
        columnWidths,
        originY: contentBottom - footerHeight,
        pageRight,
      });
    }

    pdf.setTextColor(PDF_MUTED_TEXT_COLOR);
    if (isRtl) {
      drawMixedRtlText(
        pdf,
        metadata?.footer ?? "",
        pageRight,
        pageHeight - PDF_MARGIN - 2,
        PDF_METADATA_FONT_SIZE,
      );
    } else {
      drawDirectionalText(
        pdf,
        metadata?.footer ?? "",
        PDF_MARGIN,
        pageHeight - PDF_MARGIN - 2,
        "left",
        PDF_METADATA_FONT_SIZE,
      );
    }

    page += 1;
  }

  pdf.save(fileName);
};
