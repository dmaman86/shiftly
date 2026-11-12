import { z } from "zod";
import type {
  ResearchFinding,
  ResearchSpec,
  ResearchTask,
} from "../contracts.ts";
import {
  consistencyProblems,
  INCOME_TAX_PLAUSIBILITY as SANITY,
  monthlyTaxBracketSchema,
} from "./income-tax-extraction.schema.ts";

export const monthlyBracketsValueSchema = z.strictObject({
  brackets: z
    .array(monthlyTaxBracketSchema)
    .min(SANITY.bracketCount.min)
    .max(SANITY.bracketCount.max),
});

export const creditPointValueSchema = z.strictObject({
  monthlyValue: z
    .number()
    .min(SANITY.creditPoint.min)
    .max(SANITY.creditPoint.max),
});

/** Plausibility admission is not proof of legal applicability or source verification. */
export const validateIncomeTaxFinding = (
  finding: ResearchFinding,
  task: ResearchTask,
): readonly string[] => {
  if (
    task.request.requestUnit !== "calendar_month" ||
    task.request.domain !== "income-tax" ||
    !task.request.parameters.includes(finding.kind) ||
    finding.subjectKey !== null
  )
    return [
      "Income tax requires an explicitly requested calendar month and parameter",
    ];
  // A monthly-labelled quotation is an admission check, not independent source corroboration.
  if (!/\bmonthly\b|חודשי[ת]?|לחודש/iu.test(finding.quote))
    return ["Explicit monthly units are required in the supporting quotation"];
  if (finding.kind === "income_tax.credit_point") {
    return creditPointValueSchema.safeParse(finding.value).success
      ? []
      : ["Invalid monthly value of one tax credit point"];
  }
  if (finding.kind !== "income_tax.monthly_brackets")
    return ["Unsupported income tax parameter"];
  const parsed = monthlyBracketsValueSchema.safeParse(finding.value);
  if (!parsed.success) return ["Invalid monthly progressive brackets"];
  const { brackets } = parsed.data;
  const problems = consistencyProblems(brackets);
  // Preserve the existing POC's conservative bounds, without coupling independent parameters.
  if (
    brackets[0].taxRate < SANITY.firstRate.min ||
    brackets[0].taxRate > SANITY.firstRate.max
  )
    problems.push("Implausible first marginal rate");
  const topRate = brackets.at(-1)!.taxRate;
  if (topRate < SANITY.topRate.min || topRate > SANITY.topRate.max)
    problems.push("Implausible top marginal rate");
  if (
    brackets.some(
      (bracket) => (bracket.maxIncome ?? 0) > SANITY.maxMonthlyLimit,
    )
  )
    problems.push("A monthly income limit looks annual");
  return problems;
};

export const INCOME_TAX_RESEARCH_SPEC: ResearchSpec = {
  id: "reference:income-tax",
  version: 1,
  domain: "income-tax",
  population: "Israeli resident individual with income from personal exertion",
  sourcePriority: [
    "Israel Tax Authority",
    "Official Israeli government publications and legislation",
    "Kol Zchut",
    "Wikipedia when useful",
    "Other reliable search results",
  ],
  // Cadence does not change the one-month request unit. Legislative checks are explicit tasks.
  refreshPolicy: { intervalDays: 90, unresolvedDays: 30 },
  validateFinding: validateIncomeTaxFinding,
  researchInstructions: `Research only the exact year, month and parameters in the request. Determine the rules legally applicable during that calendar month, not a yearly snapshot. Several parameters for this same month may share this single request; do not research other months as separate tasks or extrapolate missing periods.
Discover sources through Google Search, prioritizing the Israel Tax Authority, official government publications and legislation, Kol Zchut, Wikipedia when useful, then other reliable sources. Use Hebrew and English as useful. Do not bypass access restrictions or invent citations. Prefer reliable alternatives when official sources are unavailable; report uncertainty and conflicts honestly.
Return independently versionable findings for income_tax.monthly_brackets with value {brackets:[{minIncome,maxIncome,taxRate}]} and income_tax.credit_point with value {monthlyValue}. All amounts are monthly ILS; rates are decimal fractions, never percentages. Bracket boundaries use the existing inclusive whole-ILS convention: first minIncome=0, each next minIncome=previous maxIncome+1, only the final maxIncome=null. Return the complete ordinary progressive table with increasing marginal rates; never empty brackets. Do not mix annual and monthly tables, ordinary progressive tax with additional income tax (מס יסף), or the monthly value of one credit point with an employee's personal number of points. Additional income tax is outside these registered kinds; mention relevant legislation in notes rather than invent a new kind or append a surtax bracket.
Annual brackets may be cited as corroborating evidence, but never blindly divide annual thresholds by twelve. Verify the applicable monthly table. Preserve effective dates from evidence, including freezes, temporary provisions and mid-year legislation. Do not assume January 1 or reset validFrom to the requested month. If a parameter changes during the month, return both adjacent, non-overlapping applicable intervals for that parameter. validFrom is inclusive and validTo is exclusive; translate a source's inclusive end date to the next calendar day. Return actual legal effective boundaries even when they precede or extend beyond the requested month; null validTo only when no end is established. Do not create monthly copies of unchanged values or infer an unproven start date from a publication date.
Each finding needs a source and direct quotation supporting the parameter, monthly units and exact effective dates, with provider grounding attribution for each claim. A valid JSON object, plausible value or official domain alone is not verification. Unsupported values, dates or incomplete tables stay unresolved: omit the finding and report missingPeriods within the requested month. Do not guess continuity or silently repair conflicting evidence. Findings are candidates only; human approval is required before publication.`,
};
