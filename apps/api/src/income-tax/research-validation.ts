import { z } from "zod";
import type { FetchedDocument } from "../research/ports.ts";
import {
  locateQuote,
  referencedPage,
  type QuoteMatch,
} from "../research/evidence.ts";
import { appearsIn, percentAppearsIn } from "../shared/grounding.ts";
import {
  extractionStatus as status,
  failOn,
  parseComplete,
} from "../shared/validation.ts";
import {
  consistencyProblems,
  monthlyTaxBracketSchema,
  type MonthlyTaxBracket,
} from "./income-tax-extraction.schema.ts";

/**
 * Plausibility bounds, not truth: values outside them are almost certainly a
 * misread table (annual, daily, non-exertion) rather than a policy change.
 * Israel has had 6–7 monthly brackets, a 10% first rate and a 47–50% top rate
 * since 2012, and a credit point of roughly 210–250 ILS a month.
 */
const SANITY = {
  bracketCount: { min: 5, max: 9 },
  firstRate: { min: 0.05, max: 0.15 },
  topRate: { min: 0.4, max: 0.6 },
  maxMonthlyLimit: 200_000,
  creditPoint: { min: 150, max: 400 },
} as const;

const evidence = {
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  quote: z.string().min(1),
  section: z.string(),
  sourceReference: z.string(),
};

export const incomeTaxResearchSchema = z.strictObject({
  status,
  monthlyBrackets: z.strictObject({
    brackets: z.array(monthlyTaxBracketSchema).min(2).max(12),
    ...evidence,
  }),
  monthlyCreditPoint: z.strictObject({
    value: z.number().positive(),
    ...evidence,
  }),
});

type Extracted = z.infer<typeof incomeTaxResearchSchema>;

export type Evidence = {
  readonly effectiveFrom: string;
  /** The passage as it is in the fetched content, not as the model wrote it. */
  readonly quote: string;
  readonly section: string;
  readonly sourceReference: string;
  readonly page: number | null;
};

export type IncomeTaxResearchValues = {
  readonly monthlyBrackets: {
    readonly value: readonly MonthlyTaxBracket[];
  } & Evidence;
  readonly monthlyCreditPoint: { readonly value: number } & Evidence;
};

/**
 * Code decides whether to trust an extraction: schema, plausibility, the
 * effective date, that each quote is in the fetched content, and that each
 * value is written in its quote (brackets row by row, in table order).
 */
export function validateIncomeTaxResearch(
  raw: unknown,
  document: FetchedDocument,
  year: number,
): IncomeTaxResearchValues {
  const extracted = parseComplete(incomeTaxResearchSchema, raw);
  const { brackets } = extracted.monthlyBrackets;
  const creditPoint = extracted.monthlyCreditPoint.value;

  const bracketQuote = locate("monthlyBrackets", extracted, document);
  const creditQuote = locate("monthlyCreditPoint", extracted, document);

  failOn([
    ...consistencyProblems(brackets),
    ...sanityProblems(brackets, creditPoint),
    ...effectiveDateProblems(extracted, document, year),
    ...bracketQuote.problems,
    ...creditQuote.problems,
    ...(bracketQuote.match
      ? bracketRowProblems(brackets, bracketQuote.match.span)
      : []),
    ...(creditQuote.match &&
    !appearsIn(creditQuote.match.span)(String(creditPoint))
      ? [`monthlyCreditPoint: ${creditPoint} is not in its quote`]
      : []),
  ]);

  return {
    monthlyBrackets: {
      value: brackets,
      ...evidenceOf(extracted.monthlyBrackets, bracketQuote.match!),
    },
    monthlyCreditPoint: {
      value: creditPoint,
      ...evidenceOf(extracted.monthlyCreditPoint, creditQuote.match!),
    },
  };
}

function locate(
  field: "monthlyBrackets" | "monthlyCreditPoint",
  extracted: Extracted,
  document: FetchedDocument,
): { match: QuoteMatch | null; problems: string[] } {
  const { quote, sourceReference } = extracted[field];
  const match = locateQuote(document.text, quote);
  if (match === null) {
    return {
      match,
      problems: [`${field}: the quote is not in the fetched content`],
    };
  }
  const page = referencedPage(sourceReference);
  if (document.format === "pdf-text" && page !== match.page) {
    return {
      match,
      problems: [
        `${field}: sourceReference "${sourceReference}" but the quote is on page ${match.page}`,
      ],
    };
  }
  return { match, problems: [] };
}

function sanityProblems(
  brackets: readonly MonthlyTaxBracket[],
  creditPoint: number,
): string[] {
  const problems: string[] = [];
  const { bracketCount, firstRate, topRate, creditPoint: credit } = SANITY;
  if (
    brackets.length < bracketCount.min ||
    brackets.length > bracketCount.max
  ) {
    problems.push(`${brackets.length} brackets is implausible`);
  }
  const first = brackets[0].taxRate;
  if (first < firstRate.min || first > firstRate.max) {
    problems.push(`first rate ${first} is implausible`);
  }
  const top = brackets.at(-1)!.taxRate;
  if (top < topRate.min || top > topRate.max) {
    problems.push(`top rate ${top} is implausible`);
  }
  if (
    brackets.some(
      (bracket) =>
        bracket.maxIncome !== null &&
        bracket.maxIncome > SANITY.maxMonthlyLimit,
    )
  ) {
    problems.push("a monthly limit looks annual");
  }
  if (creditPoint < credit.min || creditPoint > credit.max) {
    problems.push(`credit point ${creditPoint} is implausible`);
  }
  return problems;
}

/** effectiveFrom must be a real date in the requested year, a year the document names. */
function effectiveDateProblems(
  extracted: Extracted,
  document: FetchedDocument,
  year: number,
): string[] {
  const problems: string[] = [];
  for (const field of ["monthlyBrackets", "monthlyCreditPoint"] as const) {
    const { effectiveFrom } = extracted[field];
    if (!isRealDate(effectiveFrom)) {
      problems.push(`${field}: effectiveFrom ${effectiveFrom} is not a date`);
    } else if (Number(effectiveFrom.slice(0, 4)) !== year) {
      problems.push(
        `${field}: effectiveFrom ${effectiveFrom} is not in ${year}`,
      );
    }
  }
  if (!appearsIn(document.text)(String(year))) {
    problems.push(`the document never mentions ${year}`);
  }
  return problems;
}

/**
 * Bracket i must come from a line of its quote, below the line of bracket
 * i-1, that holds its rate, its upper limit ("נוסף" for the open top bracket)
 * and, for middle rows, its lower limit. A skipped or merged row then fails
 * even though each number exists somewhere in the table.
 */
function bracketRowProblems(
  brackets: readonly MonthlyTaxBracket[],
  span: string,
): string[] {
  const lines = span.split("\n");
  let next = 0;
  for (const [index, bracket] of brackets.entries()) {
    const found = lines.findIndex(
      (line, lineIndex) => lineIndex >= next && rowMatches(line, bracket),
    );
    if (found === -1) {
      return [
        `bracket ${index} (${bracket.minIncome}–${bracket.maxIncome ?? "∞"} at ${bracket.taxRate}) is not a row of its quote, in order`,
      ];
    }
    next = found + 1;
  }
  return [];
}

function rowMatches(line: string, bracket: MonthlyTaxBracket): boolean {
  const has = appearsIn(line);
  const upper =
    bracket.maxIncome === null
      ? line.includes("נוסף")
      : has(String(bracket.maxIncome));
  // The first row ("עד") and the open top row ("כל שקל נוסף") do not write
  // their lower limit; consistencyProblems already ties it to the row above.
  const lower =
    bracket.minIncome === 0 ||
    bracket.maxIncome === null ||
    has(String(bracket.minIncome));
  return upper && lower && percentAppearsIn(line)(bracket.taxRate);
}

function evidenceOf(
  extracted: Extracted["monthlyBrackets" | "monthlyCreditPoint"],
  match: QuoteMatch,
): Evidence {
  return {
    effectiveFrom: extracted.effectiveFrom,
    quote: match.span,
    section: extracted.section,
    sourceReference: extracted.sourceReference,
    page: match.page,
  };
}

function isRealDate(value: string): boolean {
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
