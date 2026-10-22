import { z } from "zod";
import type { ExtractionProvider } from "../research/ports.ts";
import { RulesPipelineError } from "../shared/errors.ts";
import { appearsIn, percentNumberAppearsIn } from "../shared/grounding.ts";
import { failOn } from "../shared/validation.ts";
import { CONTRIBUTIONS_PARSER, flatten } from "./contributions-extraction.ts";

/**
 * The National Insurance Institute's historical records, which cover the
 * years no archived capture of the rates page does:
 *
 * - the change-point table of employee income thresholds ("החל ביום"): each
 *   row holds until the next one;
 * - the change-point table of employee rates, which states only the employee
 *   total (National Insurance and health together);
 * - the yearly "התפתחויות בתחום הביטוח הלאומי" reports, whose table by branch
 *   states the health insurance rate.
 *
 * Plain parsing, no model, as for the rates page; the validators check every
 * value and date against the text.
 */

export const THRESHOLD_HISTORY_URL =
  "https://www.btl.gov.il/Mediniyut/GeneralData/rates_1954_2007/Hachnasa/Pages/Sahir_Maasik.aspx";

export const RATE_HISTORY_URL = `https://www.btl.gov.il/Mediniyut/GeneralData/rates_1954_2007/${encodeURIComponent("שיעור דמי הביטוח כאחוז מההכנסה")}/Pages/${encodeURIComponent("שכיר בגיל הביטוח")}.aspx`;

export const annualReportUrl = (year: number) =>
  `https://www.btl.gov.il/Publications/devwlopmends-hebrew/Documents/developments_${year}-H.pdf`;

const traceOf = (task: string, raw: unknown) => ({
  model: CONTRIBUTIONS_PARSER,
  task,
  attempts: [],
  rawText: JSON.stringify(raw),
});

const providerOf = (parse: (text: string) => unknown): ExtractionProvider => ({
  async extract(task, document) {
    const raw = parse(document.text);
    return { raw, trace: traceOf(task.name, raw) };
  },
});

const unclear = (...problems: string[]) => ({
  status: "unclear" as const,
  problems,
});

const unclearSchema = z.strictObject({
  status: z.literal("unclear"),
  problems: z.array(z.string()),
});

function parsed<T>(schema: z.ZodType<T>, raw: unknown): T {
  const result = schema.safeParse(raw);
  if (!result.success) {
    throw new RulesPipelineError(
      "invalid_extraction",
      "Extraction does not match the schema",
      { issues: result.error.issues },
    );
  }
  return result.data;
}

function rejectUnclear(raw: unknown): void {
  const result = unclearSchema.safeParse(raw);
  if (result.success) {
    throw new RulesPipelineError(
      "extraction_unclear",
      "The table could not be read from the source",
      { problems: result.data.problems },
    );
  }
}

const SHEKELS = /^[\d,]+(?:\.\d+)?$/;
const PERCENT = /^\d+(?:\.\d+)?$/;
const ROW_DATE = String.raw`(\d{2})\/(\d{2})\/(\d{4})`;

const isoFromRow = (day: string, month: string, year: string) =>
  `${year}-${month}-${day}`;

// A row starts with its date; its cells run to the next row's date.
function tableRows(section: string, cells: number) {
  const rows: { date: string; cells: string[]; quote: string }[] = [];
  const row = new RegExp(
    String.raw`${ROW_DATE}\s*((?:\|[^|]*){${cells}})\|`,
    "g",
  );
  for (const match of section.matchAll(row)) {
    rows.push({
      date: isoFromRow(match[1], match[2], match[3]),
      cells: match[4]
        .split("|")
        .slice(1)
        .map((cell) => cell.trim()),
      quote: match[0].trim(),
    });
  }
  return rows;
}

// ---------------------------------------------------------------------------
// Thresholds: date | minimum wage | reduced-rate boundary | maximum
// (employer) | maximum (employee).

export type ThresholdRow = {
  /** YYYY-MM-DD the row starts. */
  readonly from: string;
  /** null when the row states no number ("אין מגבלה"); it still ends the row before it. */
  readonly reducedRateBoundary: number | null;
  readonly maxInsurableIncome: number | null;
  readonly quote: string;
};

/** Rows from the newest, as the page lists them. */
export type ThresholdHistory = { readonly rows: readonly ThresholdRow[] };

const shekels = (cell: string) =>
  SHEKELS.test(cell) ? Number(cell.replace(/,/g, "")) : null;

export function parseThresholdHistory(text: string): unknown {
  const flat = flatten(text);
  const start = flat.indexOf("החל ביום | שכר חודשי מזערי");
  if (start === -1) return unclear("the employee thresholds table is missing");
  // The table since 2000; older tables follow with other columns.
  const end = flat.indexOf("01/01/1995- 31/12/1999", start);
  const rows = tableRows(
    flat.slice(start, end === -1 ? undefined : end),
    4,
  ).map((row) => ({
    from: row.date,
    reducedRateBoundary: shekels(row.cells[1]),
    maxInsurableIncome: shekels(row.cells[3]),
    quote: row.quote,
  }));
  if (rows.length === 0) return unclear("the thresholds table has no rows");
  return { status: "complete", rows };
}

const thresholdSchema = z.strictObject({
  status: z.literal("complete"),
  rows: z
    .array(
      z.strictObject({
        from: z.iso.date(),
        reducedRateBoundary: z.number().int().positive().nullable(),
        maxInsurableIncome: z.number().int().positive().nullable(),
        quote: z.string().min(12),
      }),
    )
    .min(1),
});

export function validateThresholdHistory(
  raw: unknown,
  sourceText: string,
): ThresholdHistory {
  rejectUnclear(raw);
  const { rows } = parsed(thresholdSchema, raw);
  const text = flatten(sourceText);
  const problems: string[] = [];
  rows.forEach((row, index) => {
    if (!text.includes(row.quote)) {
      problems.push(`row ${row.from} is not in the source`);
    }
    if (!row.from.endsWith("-01")) {
      problems.push(`row ${row.from} does not start a month`);
    }
    for (const value of [row.reducedRateBoundary, row.maxInsurableIncome]) {
      if (value !== null && !appearsIn(row.quote)(String(value))) {
        problems.push(`row ${row.from}: ${value} is not in its row`);
      }
    }
    if (
      row.reducedRateBoundary !== null &&
      row.maxInsurableIncome !== null &&
      row.reducedRateBoundary >= row.maxInsurableIncome
    ) {
      problems.push(`row ${row.from}: the boundary must be below the maximum`);
    }
    if (index > 0 && rows[index - 1].from <= row.from) {
      problems.push(`row ${row.from} is out of order`);
    }
  });
  failOn(problems);
  return { rows };
}

export const THRESHOLD_HISTORY_EXTRACTION = providerOf(parseThresholdHistory);

// ---------------------------------------------------------------------------
// Employee totals: date | reduced total | employer | employee | standard
// total | employer | employee. National Insurance and health together.

export type EmployeeTotalRow = {
  readonly from: string;
  /** Decimal fractions; null when the row states no number. */
  readonly reduced: number | null;
  readonly standard: number | null;
  readonly quote: string;
};

export type EmployeeTotalHistory = {
  readonly rows: readonly EmployeeTotalRow[];
};

const fraction = (cell: string) =>
  PERCENT.test(cell) ? Math.round(Number(cell) * 10_000) / 1_000_000 : null;

export function parseEmployeeTotalHistory(text: string): unknown {
  const flat = flatten(text);
  const start = flat.indexOf("החל ביום | שיעור מופחת | שיעור מלא");
  if (start === -1) return unclear("the employee rates table is missing");
  // The table since 1995; older tables follow with other columns.
  const end = flat.indexOf("31/12/1994", start);
  const rows = tableRows(
    flat.slice(start, end === -1 ? undefined : end),
    6,
  ).map((row) => ({
    from: row.date,
    reduced: fraction(row.cells[2]),
    standard: fraction(row.cells[5]),
    quote: row.quote,
  }));
  if (rows.length === 0) return unclear("the employee rates table has no rows");
  return { status: "complete", rows };
}

const rate = z.number().gt(0).lt(1).nullable();

const totalSchema = z.strictObject({
  status: z.literal("complete"),
  rows: z
    .array(
      z.strictObject({
        from: z.iso.date(),
        reduced: rate,
        standard: rate,
        quote: z.string().min(12),
      }),
    )
    .min(1),
});

export function validateEmployeeTotalHistory(
  raw: unknown,
  sourceText: string,
): EmployeeTotalHistory {
  rejectUnclear(raw);
  const { rows } = parsed(totalSchema, raw);
  const text = flatten(sourceText);
  const problems: string[] = [];
  rows.forEach((row, index) => {
    if (!text.includes(row.quote)) {
      problems.push(`row ${row.from} is not in the source`);
    }
    if (!row.from.endsWith("-01")) {
      problems.push(`row ${row.from} does not start a month`);
    }
    for (const value of [row.reduced, row.standard]) {
      if (value !== null && !percentNumberAppearsIn(row.quote)(value)) {
        problems.push(`row ${row.from}: ${value} is not in its row`);
      }
    }
    if (index > 0 && rows[index - 1].from <= row.from) {
      problems.push(`row ${row.from} is out of order`);
    }
  });
  failOn(problems);
  return { rows };
}

export const EMPLOYEE_TOTAL_HISTORY_EXTRACTION = providerOf(
  parseEmployeeTotalHistory,
);

// ---------------------------------------------------------------------------
// Yearly report: the table of rates by branch "collected from the employer
// and the employee". Health insurance is paid by the employee alone (the
// rates page lists no employer share), so its row is the employee's rate.
// The report also prints the self-employed table; only the employee table
// has an unemployment branch ("אבטלה").

export type AnnualReportRates = {
  /** The report's year; its text states it ("בשנת 2018"). */
  readonly year: number;
  readonly yearQuote: string;
  /** YYYY-MM-DD the table states it applies from ("החל מיום 1.1.2019"); null when it states none. */
  readonly statedFrom: string | null;
  /** The year the report says rates stayed the same as ("נותרו כבשנת 2017"); null when it says nothing. */
  readonly sameAsYear: number | null;
  readonly sameAsQuote: string | null;
  readonly headerQuote: string;
  readonly healthReduced: number;
  readonly healthStandard: number;
  readonly quote: string;
};

const TWO_DECIMALS = /\d+\.\d{2}/g;

export function parseAnnualReportRates(text: string): unknown {
  const lines = text.split("\n").map(flatten);
  for (const [index, header] of lines.entries()) {
    const standardAt = header.indexOf("שיעור רגיל");
    const reducedAt = header.indexOf("שיעור מופחת");
    if (standardAt === -1 || reducedAt === -1) continue;
    const block: string[] = [];
    for (const line of lines.slice(index + 1, index + 20)) {
      block.push(line);
      if (line.includes("ביטוח בריאות")) break;
    }
    const health = block.at(-1) ?? "";
    if (!health.includes("ביטוח בריאות")) continue;
    // PDF text may split the word ("אבט לה").
    if (!block.some((line) => /אבט\s?לה/.test(line))) continue;

    const pair = (line: string | undefined) => {
      const numbers = line?.match(TWO_DECIMALS)?.map(Number) ?? [];
      if (numbers.length !== 2) return null;
      // Numbers come in the order the header names the columns.
      return standardAt < reducedAt
        ? { standard: numbers[0], reduced: numbers[1] }
        : { reduced: numbers[0], standard: numbers[1] };
    };
    const healthRates = pair(health);
    const total = pair(
      block.find((line) =>
        /^(סה"כ|סך הכל)\s+\d|\d\s+(סה"כ|סך הכל)$/.test(line),
      ),
    );
    const byLaw = pair(block.find((line) => line.includes("לפי חוק")));
    if (!healthRates || !total || !byLaw) {
      return unclear("the employee table by branch could not be read");
    }

    const started = /החל מיום\s*(\d{1,2})\.(\d{1,2})\.(\d{4})/.exec(header);
    const sameAs = /נותרו\s*כבשנת\s*(\d{4})/.exec(
      lines.slice(Math.max(0, index - 4), index).join(" "),
    );
    return {
      status: "complete",
      statedFrom: started
        ? isoFromRow(
            started[1].padStart(2, "0"),
            started[2].padStart(2, "0"),
            started[3],
          )
        : null,
      sameAsYear: sameAs ? Number(sameAs[1]) : null,
      sameAsQuote: sameAs?.[0] ?? null,
      headerQuote: header,
      healthReduced: fraction(String(healthRates.reduced)),
      healthStandard: fraction(String(healthRates.standard)),
      totals: { total, byLaw },
      quote: health,
    };
  }
  return unclear("the employee table by branch is missing");
}

const pairSchema = z.strictObject({
  reduced: z.number().positive(),
  standard: z.number().positive(),
});

const reportSchema = z.strictObject({
  status: z.literal("complete"),
  statedFrom: z.iso.date().nullable(),
  sameAsYear: z.number().int().nullable(),
  sameAsQuote: z.string().nullable(),
  headerQuote: z.string().min(12),
  healthReduced: z.number().gt(0).lt(1).nullable(),
  healthStandard: z.number().gt(0).lt(1).nullable(),
  totals: z.strictObject({ total: pairSchema, byLaw: pairSchema }),
  quote: z.string().min(12),
});

// Two decimals each, so a sum agrees to 0.01 points.
const POINTS_TOLERANCE = 0.005;

export function validateAnnualReportRates(
  raw: unknown,
  sourceText: string,
  year: number,
): AnnualReportRates {
  rejectUnclear(raw);
  const report = parsed(reportSchema, raw);
  const text = flatten(sourceText);
  const problems: string[] = [];
  // The year comes from the report's address; its text must say it too.
  // PDF text may split the digits ("בשנת 202 1").
  const yearQuote =
    new RegExp(
      String.raw`בשנת\s*${[...String(year)].join(String.raw`\s?`)}`,
    ).exec(text)?.[0] ?? "";
  if (yearQuote === "") {
    problems.push(`the report does not state the year ${year}`);
  }
  if (report.healthReduced === null || report.healthStandard === null) {
    problems.push("the health insurance rates are missing");
  }
  for (const quote of [report.quote, report.headerQuote, report.sameAsQuote]) {
    if (quote !== null && !text.includes(quote)) {
      problems.push(`"${quote}" is not in the source`);
    }
  }
  for (const value of [report.healthReduced, report.healthStandard]) {
    if (value !== null && !percentNumberAppearsIn(report.quote)(value)) {
      problems.push(`health insurance ${value} is not in its row`);
    }
  }
  if (
    report.healthReduced !== null &&
    report.healthStandard !== null &&
    report.healthReduced >= report.healthStandard
  ) {
    problems.push("the reduced health rate must be below the standard one");
  }
  // The table must add up: the total is the National Insurance law's part
  // plus health insurance, for each column.
  const health = {
    reduced: (report.healthReduced ?? 0) * 100,
    standard: (report.healthStandard ?? 0) * 100,
  };
  for (const column of ["reduced", "standard"] as const) {
    const { total, byLaw } = report.totals;
    if (
      Math.abs(byLaw[column] + health[column] - total[column]) >
      POINTS_TOLERANCE
    ) {
      problems.push(`the ${column} column does not add up`);
    }
  }
  if (report.sameAsYear !== null && report.sameAsYear >= year) {
    problems.push(
      `the report cannot compare ${year} with ${report.sameAsYear}`,
    );
  }
  if (report.statedFrom !== null && !report.statedFrom.endsWith("-01")) {
    problems.push(`${report.statedFrom} does not start a month`);
  }
  failOn(problems);
  return {
    year,
    yearQuote,
    statedFrom: report.statedFrom,
    sameAsYear: report.sameAsYear,
    sameAsQuote: report.sameAsQuote,
    headerQuote: report.headerQuote,
    healthReduced: report.healthReduced as number,
    healthStandard: report.healthStandard as number,
    quote: report.quote,
  };
}

export const ANNUAL_REPORT_EXTRACTION = providerOf(parseAnnualReportRates);
