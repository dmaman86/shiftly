import type { ExtractionTask } from "../shared/extraction-task.ts";
import type { ExtractionProvider } from "../research/ports.ts";
import type { ContributionParameter } from "./employee-contributions.ts";

/**
 * Reads the six parameters from the two layouts the research uses: the
 * National Insurance Institute's employee rates table (live or archived) and
 * Kol Zchut's employee deductions section. Plain parsing, no model: the
 * tables are regular, and anything that does not match is reported as
 * unclear instead of guessed. The validator then checks every value and date
 * against the text, as it does for model answers.
 */

type RawClaim = {
  readonly value: number;
  readonly statedFrom: string | null;
  readonly statedUntil: string | null;
  /** The words that state the date, e.g. "01.02.2025" or "מפברואר 2025". */
  readonly statedFromText: string | null;
  readonly quote: string;
  readonly statedFromQuote: string | null;
};

export type RawContributionsExtraction =
  | {
      readonly status: "complete";
      readonly parameters: Readonly<Record<ContributionParameter, RawClaim>>;
      /** The combined employee rate of each part, as the source states it. */
      readonly totals: {
        readonly reduced: RawClaim | null;
        readonly standard: RawClaim | null;
      };
      readonly annualMaxUpdate: string | null;
    }
  | { readonly status: "unclear"; readonly problems: readonly string[] };

/** Names the parsing in the trace; never sent to a model. */
export const CONTRIBUTIONS_TASK: ExtractionTask = {
  name: "employee_contributions",
  systemInstruction:
    "Parsed by code, not by a model: the employee National Insurance and health insurance rates table.",
  responseSchema: {},
};

export const CONTRIBUTIONS_PARSER = "deterministic-contributions-parser";

/** Picks the parser by publisher; the generic pipeline treats it as any extractor. */
export const CONTRIBUTIONS_EXTRACTION: ExtractionProvider = {
  async extract(task, document) {
    const raw = isKolZchut(document.publisher)
      ? parseKolZchutDeductions(document.text)
      : parseBtlEmployeeRates(document.text);
    return {
      raw,
      trace: {
        model: CONTRIBUTIONS_PARSER,
        task: task.name,
        attempts: [],
        rawText: JSON.stringify(raw),
      },
    };
  },
};

const isKolZchut = (publisher: string) =>
  publisher === "kolzchut.org.il" || publisher.endsWith(".kolzchut.org.il");

const INVISIBLE = /[\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g;

/** Invisible marks dropped and whitespace collapsed, so quotes compare across line breaks. */
export const flatten = (text: string) =>
  text.replace(INVISIBLE, "").replace(/\s+/g, " ").trim();

const HEBREW_MONTHS: Readonly<Record<string, number>> = {
  ינואר: 1,
  פברואר: 2,
  מרץ: 3,
  מרס: 3,
  אפריל: 4,
  מאי: 5,
  יוני: 6,
  יולי: 7,
  אוגוסט: 8,
  ספטמבר: 9,
  אוקטובר: 10,
  נובמבר: 11,
  דצמבר: 12,
};
const MONTH_NAMES = Object.keys(HEBREW_MONTHS).join("|");

const DOTTED = String.raw`(\d{2})\.(\d{2})\.(\d{4})`;

/**
 * The date a statement gives, as YYYY-MM-DD: "01.02.2025", "מפברואר 2025"
 * (the first of that month) or "נכון ל-2026" (January 1 of that year).
 * null when the text states no real date.
 */
export function dateFromStatement(text: string): string | null {
  const dotted = new RegExp(DOTTED).exec(text);
  if (dotted) return isoDate(+dotted[3], +dotted[2], +dotted[1]);
  const named = new RegExp(String.raw`(?:מ|ב)?(${MONTH_NAMES})\s+(\d{4})`).exec(
    text,
  );
  if (named) return isoDate(+named[2], HEBREW_MONTHS[named[1]], 1);
  const year = /נכון ל-\s*(\d{4})/.exec(text);
  if (year) return isoDate(+year[1], 1, 1);
  return null;
}

function isoDate(year: number, month: number, day: number): string | null {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}

/** "נכון ל-2020" holds for 2020 only: the end of that year; null for other statements. */
export function yearLimitOfStatement(text: string): string | null {
  const year = /^נכון ל-\s*(\d{4})$/.exec(text.trim());
  return year ? `${Number(year[1]) + 1}-01-01` : null;
}

const unclear = (...problems: string[]): RawContributionsExtraction => ({
  status: "unclear",
  problems,
});

/** A percentage as a decimal fraction, without float noise: 5.17 → 0.0517. */
const fraction = (percent: number) => Math.round(percent * 10_000) / 1_000_000;

// ---------------------------------------------------------------------------
// National Insurance Institute: "שיעורי דמי ביטוח לאומי ודמי ביטוח בריאות
// עבור עובדים שכירים ... באחוזים מהשכר". Two salary bands, then rows of six
// cells: employer, employee and total for the reduced band, then the same for
// the standard band. A cell may carry its own "(החל ב- dd.mm.yyyy)"; the
// others take the date in the table heading.

const STARTED = String.raw`\(\s*החל ב-\s*(\d{2}\.\d{2}\.\d{4})\s*\)`;
const BAND_AMOUNT = String.raw`-\s*([\d,]+)\s*ש"ח(?:\s*${STARTED})?`;
const CELL = new RegExp(
  String.raw`^%?\s*(\d+(?:\.\d+)?)\s*%?\s*(?:${STARTED})?$`,
);

type TableDate = { readonly text: string; readonly quote: string } | null;

export function parseBtlEmployeeRates(
  text: string,
): RawContributionsExtraction {
  const flat = flatten(text);
  const start = flat.indexOf("באחוזים מהשכר");
  if (start === -1) return unclear("the employee rates table is missing");
  const end = flat.indexOf("פירוט שיעורי", start);
  const section = flat.slice(start, end === -1 ? undefined : end);

  const firstBand = section.indexOf("מחלק השכר");
  const heading = section.slice(0, firstBand === -1 ? 300 : firstBand);
  const headingDate = new RegExp(
    String.raw`(?:מעודכן ל-|החל ב-)\s*${DOTTED}`,
  ).exec(heading);
  const table: TableDate = headingDate
    ? { text: headingDate[0], quote: headingDate[0] }
    : null;

  const problems: string[] = [];
  const band = (name: string, pattern: string): RawClaim | null => {
    const match = new RegExp(pattern + BAND_AMOUNT).exec(section);
    if (!match) {
      problems.push(`${name} is missing`);
      return null;
    }
    return claim(Number(match[1].replace(/,/g, "")), match[0], match[2], table);
  };
  const reducedRateBoundary = band(
    "the reduced-rate boundary",
    "מחלק השכר שעד[^|]*?",
  );
  const maxInsurableIncome = band(
    "the maximum insurable income",
    "ההכנסה המרבית החייבת בדמי ביטוח[^|]*?",
  );

  const nationalInsurance = row(section, "דמי ביטוח לאומי", 0);
  const health = row(section, "דמי ביטוח בריאות", nationalInsurance?.at ?? 0);
  const totals = row(section, "סך הכול", health?.at ?? section.length);
  if (!nationalInsurance)
    problems.push("the National Insurance row is missing");
  if (!health) problems.push("the health insurance row is missing");

  const rate = (
    name: string,
    found: Row | null,
    column: number,
  ): RawClaim | null => {
    if (!found) return null;
    const cell = CELL.exec(found.cells[column]);
    if (!cell) {
      problems.push(`${name}: "${found.cells[column]}" is not a rate`);
      return null;
    }
    return claim(fraction(Number(cell[1])), found.quote, cell[2], table);
  };
  // Columns: 0 employer, 1 employee, 2 total (reduced); 3, 4, 5 the same (standard).
  const parameters = {
    reducedRateBoundary,
    maxInsurableIncome,
    nationalInsuranceReducedRate: rate(
      "national insurance reduced",
      nationalInsurance,
      1,
    ),
    nationalInsuranceStandardRate: rate(
      "national insurance standard",
      nationalInsurance,
      4,
    ),
    healthInsuranceReducedRate: rate("health reduced", health, 1),
    healthInsuranceStandardRate: rate("health standard", health, 4),
  };
  if (problems.length > 0) return unclear(...problems);

  const optionalRate = (column: number) => {
    const cell = totals ? CELL.exec(totals.cells[column]) : null;
    return totals && cell
      ? claim(fraction(Number(cell[1])), totals.quote, cell[2], table)
      : null;
  };
  const annual = /ההכנסה המרבית מתעדכנת[^.|]*?בינואר כל שנה/.exec(section);
  return {
    status: "complete",
    parameters: parameters as Record<ContributionParameter, RawClaim>,
    totals: { reduced: optionalRate(1), standard: optionalRate(4) },
    annualMaxUpdate: annual?.[0] ?? null,
  };
}

type Row = {
  readonly at: number;
  readonly cells: readonly string[];
  readonly quote: string;
};

/** The six cells after a row label, searched from `from` on. */
function row(section: string, label: string, from: number): Row | null {
  const at = section.indexOf(`${label} |`, from);
  if (at === -1) return null;
  const parts = section.slice(at + label.length).split("|");
  const cells = parts.slice(1, 7).map((cell) => cell.trim());
  if (cells.length < 6) return null;
  const quote = `${label} |${parts.slice(1, 7).join("|")}|`.trim();
  return { at, cells, quote };
}

/** A cell's own date wins; otherwise the table heading's, when there is one. */
function claim(
  value: number,
  quote: string,
  ownDate: string | undefined,
  table: TableDate,
): RawClaim {
  const statedFromText = ownDate ?? table?.text ?? null;
  return {
    value,
    statedFrom:
      statedFromText === null ? null : dateFromStatement(statedFromText),
    statedUntil:
      statedFromText === null ? null : yearLimitOfStatement(statedFromText),
    statedFromText,
    quote,
    statedFromQuote: ownDate ? quote : (table?.quote ?? null),
  };
}

// ---------------------------------------------------------------------------
// Kol Zchut, "דמי ביטוח לאומי לעובד שכיר", section "לנכות משכר העובד" as
// rendered for a date: a bullet per salary band, a sub-bullet with the
// combined rate, and one sub-sub-bullet per insurance.

const KZ_STARTED = new RegExp(
  String.raw`\(\s*החל\s*(?:(?:מיום|ביום|ב-|מ-)\s*\d{2}\.\d{2}\.\d{4}|(?:מ|ב)(?:${MONTH_NAMES})\s+\d{4})\s*\)`,
);
const KZ_AMOUNT = /([\d,]{4,})\s*(?:₪|ש"ח)/;
const KZ_YEAR = /נכון ל-\s*\d{4}/;

export function parseKolZchutDeductions(
  text: string,
): RawContributionsExtraction {
  const lines = text
    .split("\n")
    .map(flatten)
    .filter((line) => line.length > 0);
  const reduced = bulletBlock(lines, /^\*\s*על חלק השכר שעד/);
  const standard = bulletBlock(lines, /^\*\s*על חלק השכר שמעל/);
  if (!reduced || !standard) {
    return unclear("the employee deductions bullets are missing");
  }

  const problems: string[] = [];
  const amount = (name: string, line: string): RawClaim | null => {
    const match = KZ_AMOUNT.exec(line);
    if (!match) {
      problems.push(`${name} is missing`);
      return null;
    }
    const stated = KZ_YEAR.exec(line)?.[0];
    return datedClaim(Number(match[1].replace(/,/g, "")), line, stated);
  };
  const maxLine = standard[0].slice(standard[0].indexOf("ועד"));

  const rate = (name: string, block: readonly string[], label: string) => {
    const line = block.find((candidate) => candidate.includes(label));
    const match = line
      ? new RegExp(String.raw`${label}(?: של)?\s*(\d+(?:\.\d+)?)%`).exec(line)
      : null;
    if (!line || !match) {
      problems.push(`${name} is missing`);
      return null;
    }
    return datedClaim(
      fraction(Number(match[1])),
      line,
      KZ_STARTED.exec(line)?.[0],
    );
  };

  const parameters = {
    reducedRateBoundary: amount("the reduced-rate boundary", reduced[0]),
    maxInsurableIncome: amount("the maximum insurable income", maxLine),
    nationalInsuranceReducedRate: rate(
      "national insurance reduced",
      reduced,
      "דמי ביטוח לאומי בשיעור",
    ),
    nationalInsuranceStandardRate: rate(
      "national insurance standard",
      standard,
      "דמי ביטוח לאומי בשיעור",
    ),
    healthInsuranceReducedRate: rate(
      "health reduced",
      reduced,
      "דמי ביטוח בריאות בשיעור",
    ),
    healthInsuranceStandardRate: rate(
      "health standard",
      standard,
      "דמי ביטוח בריאות בשיעור",
    ),
  };
  if (problems.length > 0) return unclear(...problems);

  const total = (block: readonly string[]) => {
    const line = block.find((candidate) => /^\*\*[^*]/.test(candidate));
    const match = line ? /בשיעור(?: של)?\s*(\d+(?:\.\d+)?)%/.exec(line) : null;
    return line && match
      ? datedClaim(fraction(Number(match[1])), line, KZ_STARTED.exec(line)?.[0])
      : null;
  };
  return {
    status: "complete",
    parameters: parameters as Record<ContributionParameter, RawClaim>,
    totals: { reduced: total(reduced), standard: total(standard) },
    annualMaxUpdate: null,
  };
}

/** The top-level bullet that matches, with its sub-bullets. */
function bulletBlock(
  lines: readonly string[],
  heading: RegExp,
): string[] | null {
  const start = lines.findIndex((line) => heading.test(line));
  if (start === -1) return null;
  const block = [lines[start]];
  for (const line of lines.slice(start + 1)) {
    if (!line.startsWith("**")) break;
    block.push(line);
  }
  return block;
}

function datedClaim(
  value: number,
  line: string,
  stated: string | undefined,
): RawClaim {
  return {
    value,
    statedFrom: stated === undefined ? null : dateFromStatement(stated),
    statedUntil: stated === undefined ? null : yearLimitOfStatement(stated),
    statedFromText: stated ?? null,
    quote: line,
    statedFromQuote: stated === undefined ? null : line,
  };
}
