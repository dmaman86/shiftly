import type { ContributionParameter } from "../../../../src/research/social-security/employee-contributions.ts";

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
