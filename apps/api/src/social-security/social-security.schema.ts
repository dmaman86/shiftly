import { z } from "zod";
import { appearsIn, percentAppearsIn } from "../shared/grounding.ts";
import {
  extractionStatus as status,
  failOn,
  parseComplete,
} from "../shared/validation.ts";

const rate = z.number().gt(0).lt(1);
const rateSplit = z.strictObject({
  nationalInsurance: rate,
  health: rate,
  /** As stated in the source; checked against the parts, then dropped. */
  total: rate,
});

export const employeeContributionsExtractionSchema = z.strictObject({
  status,
  asOfYear: z.number().int().min(2000).max(2100),
  reducedRateCeiling: z.number().int().positive(),
  maxInsurableIncome: z.number().int().positive(),
  reducedRate: rateSplit,
  fullRate: rateSplit,
});

type EmployeeContributionsExtraction = z.infer<
  typeof employeeContributionsExtractionSchema
>;

/** Decimal fractions of the salary part they apply to. */
export type ContributionRate = {
  readonly nationalInsurance: number;
  readonly health: number;
};

/** Monthly deductions from an employee's salary (employer contributions excluded). */
export type EmployeeContributionRules = {
  /** Salary up to this amount pays `reducedRate`. */
  readonly reducedRateCeiling: number;
  /** Salary above the ceiling and up to this amount pays `fullRate`; above it, nothing. */
  readonly maxInsurableIncome: number;
  readonly reducedRate: ContributionRate;
  readonly fullRate: ContributionRate;
};

export type ValidatedEmployeeContributions = {
  readonly asOfYear: number;
  readonly rules: EmployeeContributionRules;
};

// Rates are written with two decimals (4.27%), so parts and total agree to 0.0001.
const RATE_TOLERANCE = 0.00005;

/**
 * The validator, not the model, decides whether an extraction is usable:
 * structure, internal consistency, and that every value is literally present
 * in the rendered source text.
 */
export function validateEmployeeContributionsExtraction(
  raw: unknown,
  sourceText: string,
): ValidatedEmployeeContributions {
  const extraction = parseComplete(employeeContributionsExtractionSchema, raw);
  failOn([
    ...consistencyProblems(extraction),
    ...groundingProblems(extraction, sourceText),
  ]);
  const split = ({ nationalInsurance, health }: ContributionRate) => ({
    nationalInsurance,
    health,
  });
  return {
    asOfYear: extraction.asOfYear,
    rules: {
      reducedRateCeiling: extraction.reducedRateCeiling,
      maxInsurableIncome: extraction.maxInsurableIncome,
      reducedRate: split(extraction.reducedRate),
      fullRate: split(extraction.fullRate),
    },
  };
}

function consistencyProblems(
  extraction: EmployeeContributionsExtraction,
): string[] {
  const problems: string[] = [];
  if (extraction.reducedRateCeiling >= extraction.maxInsurableIncome) {
    problems.push("reducedRateCeiling must be below maxInsurableIncome");
  }
  for (const part of ["reducedRate", "fullRate"] as const) {
    const { nationalInsurance, health, total } = extraction[part];
    if (Math.abs(nationalInsurance + health - total) > RATE_TOLERANCE) {
      problems.push(`${part}: nationalInsurance + health must equal total`);
    }
  }
  if (extraction.reducedRate.total >= extraction.fullRate.total) {
    problems.push("reducedRate.total must be below fullRate.total");
  }
  return problems;
}

function groundingProblems(
  extraction: EmployeeContributionsExtraction,
  sourceText: string,
): string[] {
  const appears = appearsIn(sourceText);
  const percentAppears = percentAppearsIn(sourceText);
  const problems: string[] = [];

  for (const field of [
    "asOfYear",
    "reducedRateCeiling",
    "maxInsurableIncome",
  ] as const) {
    if (!appears(String(extraction[field]))) {
      problems.push(`${field} ${extraction[field]} is not in the source`);
    }
  }
  for (const part of ["reducedRate", "fullRate"] as const) {
    for (const key of ["nationalInsurance", "health", "total"] as const) {
      if (!percentAppears(extraction[part][key])) {
        problems.push(
          `${part}.${key} ${extraction[part][key]} is not in the source as a percentage`,
        );
      }
    }
  }
  return problems;
}
