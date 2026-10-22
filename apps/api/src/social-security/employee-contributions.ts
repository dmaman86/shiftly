import { z } from "zod";
import type { ReferenceKind } from "../reference-data/ports.ts";

/**
 * What an employee's salary pays to National Insurance and health insurance
 * each month. Each parameter changes on its own date, so each one is its own
 * timeline: 2025 changed the maximum in January, the reduced rates in January
 * and the health standard rate in February, while the boundary stayed at its
 * 2024 value. The boundary and the maximum are shared by both insurances.
 */
export const CONTRIBUTION_PARAMETERS = [
  "reducedRateBoundary",
  "maxInsurableIncome",
  "nationalInsuranceReducedRate",
  "nationalInsuranceStandardRate",
  "healthInsuranceReducedRate",
  "healthInsuranceStandardRate",
] as const;

export type ContributionParameter = (typeof CONTRIBUTION_PARAMETERS)[number];

export const CONTRIBUTION_KINDS = {
  reducedRateBoundary: "social_security.reduced_rate_boundary",
  maxInsurableIncome: "social_security.max_insurable_income",
  nationalInsuranceReducedRate: "national_insurance.employee_reduced_rate",
  nationalInsuranceStandardRate: "national_insurance.employee_standard_rate",
  healthInsuranceReducedRate: "health_insurance.employee_reduced_rate",
  healthInsuranceStandardRate: "health_insurance.employee_standard_rate",
} as const satisfies Record<ContributionParameter, ReferenceKind>;

/** Monthly ILS amounts; the other parameters are rates. */
export const isAmountParameter = (parameter: ContributionParameter) =>
  parameter === "reducedRateBoundary" || parameter === "maxInsurableIncome";

/** A monthly ILS amount, as the official tables state it: whole shekels. */
export const amountValueSchema = z.strictObject({
  amount: z.number().int().positive(),
});

/** A decimal fraction of the salary part it applies to: 1.04% is 0.0104. */
export const rateValueSchema = z.strictObject({
  rate: z.number().gt(0).lt(1),
});

export type ContributionValue =
  z.infer<typeof amountValueSchema> | z.infer<typeof rateValueSchema>;

/** The stored value of a parameter; throws when it is out of range. */
export function contributionValue(
  parameter: ContributionParameter,
  value: number,
): ContributionValue {
  return isAmountParameter(parameter)
    ? amountValueSchema.parse({ amount: value })
    : rateValueSchema.parse({ rate: value });
}

/** One parameter as one source states it. */
export type ContributionClaim = {
  /** ILS amount, or a decimal fraction for rates. */
  readonly value: number;
  /** First day the source says the value applies (YYYY-MM-01); null when it does not say. */
  readonly statedFrom: string | null;
  /**
   * End (exclusive) of the period the source limits its statement to:
   * "נכון ל-2020" states the 2020 value, not the values after it. null when
   * the source sets no end.
   */
  readonly statedUntil: string | null;
  /** The passage the value was read from, verbatim. */
  readonly quote: string;
  /** The passage that states `statedFrom`; null when nothing does. */
  readonly statedFromQuote: string | null;
};

/** Everything one source states about the six parameters. */
export type ContributionClaims = {
  readonly claims: Readonly<Record<ContributionParameter, ContributionClaim>>;
  /**
   * The source's statement that the maximum insurable income changes only in
   * January, verbatim; null when it makes none.
   */
  readonly annualMaxUpdate: string | null;
};
