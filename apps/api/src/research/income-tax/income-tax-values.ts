import { z } from "zod";

/** Conservative admission bounds inherited from the POC, not evidence of legal correctness. */
export const INCOME_TAX_PLAUSIBILITY = {
  bracketCount: { min: 5, max: 9 },
  firstRate: { min: 0.05, max: 0.15 },
  topRate: { min: 0.4, max: 0.6 },
  maxMonthlyLimit: 200_000,
  creditPoint: { min: 150, max: 400 },
} as const;

export const monthlyTaxBracketSchema = z.strictObject({
  minIncome: z.number().int().nonnegative(),
  /** null only for the open-ended top bracket. */
  maxIncome: z.number().int().positive().nullable(),
  /** Decimal fraction: 0.10 = 10%. */
  taxRate: z.number().gt(0).lt(1),
});

export type MonthlyTaxBracket = z.infer<typeof monthlyTaxBracketSchema>;

/** Brackets are contiguous from 0, open-ended only at the top, with rising rates. */
export const consistencyProblems = (
  brackets: readonly MonthlyTaxBracket[],
): string[] => {
  const problems: string[] = [];
  if (brackets[0].minIncome !== 0)
    problems.push("first bracket must start at 0");

  brackets.forEach((bracket, index) => {
    const isLast = index === brackets.length - 1;
    if (isLast !== (bracket.maxIncome === null)) {
      problems.push(
        `bracket ${index}: only the last bracket may be open-ended`,
      );
    }
    if (bracket.maxIncome !== null && bracket.maxIncome <= bracket.minIncome) {
      problems.push(`bracket ${index}: maxIncome must exceed minIncome`);
    }
    if (index === 0) return;
    const previous = brackets[index - 1];
    if (
      previous.maxIncome !== null &&
      bracket.minIncome !== previous.maxIncome + 1
    ) {
      problems.push(
        `bracket ${index}: minIncome must be the previous maxIncome + 1`,
      );
    }
    if (bracket.taxRate <= previous.taxRate) {
      problems.push(`bracket ${index}: rates must be strictly increasing`);
    }
  });
  return problems;
};
