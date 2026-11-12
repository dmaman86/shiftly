import {
  consistencyProblems,
  monthlyTaxBracketSchema,
} from "../../../../src/research/income-tax/income-tax-values.ts";
import type { MonthlyTaxBracket } from "../../../../src/research/income-tax/income-tax-values.ts";
import { z } from "zod";
import { appearsIn } from "../../../../src/research/shared/grounding.ts";
import {
  extractionStatus as status,
  failOn,
  parseComplete,
} from "../shared/validation.ts";
import { wikitextTableRows } from "../shared/wikitext.ts";

export const bracketExtractionSchema = z.strictObject({
  status,
  monthlyBrackets: z.array(monthlyTaxBracketSchema).min(2).max(12),
});

export const creditPointExtractionSchema = z.strictObject({
  status,
  /** One row per year listed in the table, in table order. */
  rows: z
    .array(
      z.strictObject({
        year: z.number().int().min(1900).max(2100),
        /** ILS per month for one credit point (נקודת זיכוי). */
        monthlyValue: z.number().positive(),
      }),
    )
    .min(1),
});

export type CreditPointRow = z.infer<
  typeof creditPointExtractionSchema
>["rows"][number];

/**
 * The validator, not the model, decides whether an extraction is usable:
 * structure, internal consistency, and that every value is literally present
 * in the table row and cell it was supposed to come from.
 */
export const validateBracketExtraction = (
  raw: unknown,
  sourceText: string,
): MonthlyTaxBracket[] => {
  const { monthlyBrackets } = parseComplete(bracketExtractionSchema, raw);
  failOn([
    ...consistencyProblems(monthlyBrackets),
    ...bracketGroundingProblems(monthlyBrackets, sourceText),
  ]);
  return monthlyBrackets;
};

export const validateCreditPointExtraction = (
  raw: unknown,
  sourceText: string,
): CreditPointRow[] => {
  const { rows } = parseComplete(creditPointExtractionSchema, raw);
  failOn(creditPointGroundingProblems(rows, sourceText));
  return rows;
};

/**
 * Row-level grounding: bracket i must come from data row i of the table, its
 * rate from the first cell and its monthly limit from the second. Checking
 * values one by one is not enough: a merged or skipped row still uses only
 * numbers that exist somewhere in the table.
 */
const bracketGroundingProblems = (
  brackets: readonly MonthlyTaxBracket[],
  sourceText: string,
): string[] => {
  const rows = wikitextTableRows(sourceText).filter((cells) =>
    /\d%/.test(cells[0] ?? ""),
  );
  if (brackets.length !== rows.length) {
    return [
      `${brackets.length} brackets extracted but the table has ${rows.length} rows`,
    ];
  }

  const problems: string[] = [];
  brackets.forEach((bracket, index) => {
    const [rateCell = "", limitCell = ""] = rows[index];
    const percent = String(Math.round(bracket.taxRate * 10_000) / 100);
    if (!appearsIn(rateCell)(`${percent}%`)) {
      problems.push(
        `bracket ${index}: rate ${percent}% is not in row ${index}, column 1`,
      );
    }
    if (bracket.maxIncome === null) {
      if (!limitCell.includes("נוסף")) {
        problems.push(
          `bracket ${index}: open-ended bracket is not the "נוסף" row`,
        );
      }
    } else if (!appearsIn(limitCell)(String(bracket.maxIncome))) {
      problems.push(
        `bracket ${index}: maxIncome ${bracket.maxIncome} is not in row ${index}, column 2`,
      );
    }
  });
  return problems;
};

/** Row i must hold year i in its first cell and the monthly value in its second. */
const creditPointGroundingProblems = (
  rows: readonly CreditPointRow[],
  sourceText: string,
): string[] => {
  const tableRows = wikitextTableRows(sourceText).filter((cells) =>
    /^'*\d{4}'*$/.test(cells[0] ?? ""),
  );
  if (rows.length !== tableRows.length) {
    return [
      `${rows.length} rows extracted but the table has ${tableRows.length} years`,
    ];
  }

  const problems: string[] = [];
  rows.forEach((row, index) => {
    const [yearCell = "", valueCell = ""] = tableRows[index];
    if (!appearsIn(yearCell)(String(row.year))) {
      problems.push(`row ${index}: year ${row.year} is not in column 1`);
    }
    if (!appearsIn(valueCell)(String(row.monthlyValue))) {
      problems.push(
        `row ${index}: monthly value ${row.monthlyValue} is not in column 2`,
      );
    }
  });
  return problems;
};
