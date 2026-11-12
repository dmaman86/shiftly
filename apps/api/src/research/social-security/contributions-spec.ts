import {
  RESEARCH_DOMAINS,
  type ResearchFinding,
  type ResearchSpec,
  type ResearchTask,
} from "../contracts.ts";
import { appearsIn, percentNumberAppearsIn } from "../shared/grounding.ts";
import {
  amountValueSchema,
  rateValueSchema,
} from "./employee-contributions.ts";

const AMOUNT_KINDS: readonly string[] = [
  "social_security.reduced_rate_boundary",
  "social_security.max_insurable_income",
];

/** Literal values only: no totals-minus-parts derivation and no invented yearly indexation. */
export const validateContributionFinding = (
  finding: ResearchFinding,
  task: ResearchTask,
): readonly string[] => {
  if (
    task.request.requestUnit !== "calendar_month" ||
    task.request.domain !== "contributions" ||
    !task.request.parameters.includes(finding.kind) ||
    !(RESEARCH_DOMAINS.contributions as readonly string[]).includes(
      finding.kind,
    ) ||
    finding.subjectKey !== null
  )
    return [
      "Contributions require an explicitly requested month and parameter",
    ];
  const quote = finding.quote;
  // Text checks are conservative admission heuristics, not independent source verification.
  if (
    /\b(?:derived|calculated|computed|estimated|extrapolated)\b|נגזר|מחושב|נאמד|אקסטרפולציה/iu.test(
      quote,
    )
  )
    return ["Derived or extrapolated contributions remain unresolved"];
  if (!/\bemployee(?:s|'s)?\b|עובד/iu.test(quote))
    return [
      "Explicit employee context is required; employer-only evidence is insufficient",
    ];
  if (AMOUNT_KINDS.includes(finding.kind)) {
    const parsed = amountValueSchema.safeParse(finding.value);
    if (!parsed.success) return ["Invalid monthly contribution amount"];
    if (!/\bmonthly\b|חודשי[ת]?|לחודש/iu.test(quote))
      return ["Monthly units are required for shared income thresholds"];
    return appearsIn(quote)(String(parsed.data.amount))
      ? []
      : ["The literal monthly amount is absent from its quotation"];
  }
  const parsed = rateValueSchema.safeParse(finding.value);
  if (!parsed.success) return ["Invalid employee contribution rate"];
  if (/\bemployer(?:s|'s)?\b|מעסיק|מעביד/iu.test(quote))
    return [
      "A mixed employee/employer rate quotation cannot disambiguate the employee share",
    ];
  const explicitPercent = /%|\bpercent(?:age)?\b|אחוז/iu.test(quote);
  const explicitFraction = /\bdecimal fraction\b|שבר עשרוני/iu.test(quote);
  return (explicitPercent && percentNumberAppearsIn(quote)(parsed.data.rate)) ||
    (explicitFraction && appearsIn(quote)(String(parsed.data.rate)))
    ? []
    : ["The literal employee rate and its units are absent from its quotation"];
};

const overlaps = (left: ResearchFinding, right: ResearchFinding): boolean =>
  left.validFrom < (right.validTo ?? "9999-12-31") &&
  right.validFrom < (left.validTo ?? "9999-12-31");

const ORDERED_PAIRS = [
  [
    "social_security.reduced_rate_boundary",
    "social_security.max_insurable_income",
  ],
  [
    "national_insurance.employee_reduced_rate",
    "national_insurance.employee_standard_rate",
  ],
  [
    "health_insurance.employee_reduced_rate",
    "health_insurance.employee_standard_rate",
  ],
] as const;

/** Each comparison is temporal and optional: a missing peer is never inferred or requested implicitly. */
export const validateRelatedContributionFinding = (
  finding: ResearchFinding,
  findings: readonly ResearchFinding[],
): readonly string[] => {
  const problems: string[] = [];
  for (const [lower, upper] of ORDERED_PAIRS) {
    if (finding.kind !== lower && finding.kind !== upper) continue;
    for (const other of findings) {
      if (
        other.kind !== (finding.kind === lower ? upper : lower) ||
        !overlaps(finding, other)
      )
        continue;
      const first = finding.kind === lower ? finding : other;
      const second = finding.kind === upper ? finding : other;
      if (lower === "social_security.reduced_rate_boundary") {
        if (
          amountValueSchema.parse(first.value).amount >=
          amountValueSchema.parse(second.value).amount
        )
          problems.push(
            "The reduced boundary must be below the maximum income",
          );
      } else if (
        rateValueSchema.parse(first.value).rate >
        rateValueSchema.parse(second.value).rate
      )
        problems.push(
          "A reduced employee rate cannot exceed its standard rate",
        );
    }
  }
  if (!AMOUNT_KINDS.includes(finding.kind)) {
    const peer = finding.kind.startsWith("national_insurance.")
      ? finding.kind.replace("national_insurance.", "health_insurance.")
      : finding.kind.replace("health_insurance.", "national_insurance.");
    for (const other of findings) {
      if (
        other.kind === peer &&
        overlaps(finding, other) &&
        rateValueSchema.parse(finding.value).rate +
          rateValueSchema.parse(other.value).rate >=
          1
      )
        problems.push(
          "Combined employee contributions must remain below the salary band",
        );
    }
  }
  return problems;
};

export const CONTRIBUTIONS_RESEARCH_SPEC: ResearchSpec = {
  id: "reference:contributions",
  version: 1,
  domain: "contributions",
  population:
    "Israeli resident ordinary salaried employee, age 18 to retirement age, non-controlling shareholder",
  sourcePriority: [
    "National Insurance Institute (BTL)",
    "Official historical BTL tables and publications",
    "Official Israeli government sources",
    "Kol Zchut",
    "Wikipedia when useful",
    "Other reliable search results",
  ],
  refreshPolicy: { intervalDays: 30, unresolvedDays: 30 },
  validateFinding: validateContributionFinding,
  validateRelatedFinding: validateRelatedContributionFinding,
  researchInstructions: `Research only the exact year, month and required parameters in this request. Historical coverage begins November 1, 2015; do not research other months as additional tasks, repeat covered history or infer missing intervals. Multiple parameters of this same month can share this single request; months cannot be batched.
Use the BTL classification for an Israeli resident ordinary salaried employee aged 18 to retirement age who is not a controlling shareholder. Extract employee contributions only, not employer contributions, self-employed rates, non-residents, minors or retirees. Explicitly identify the applicable population and employee column in evidence. Thresholds are monthly ILS and are shared by National Insurance and Health Insurance, not duplicated by insurance domain.
Discover authoritative sources with Google Search, preferring BTL, official historical BTL tables and publications, government, Kol Zchut, Wikipedia when useful, then reliable alternatives. For missing history, prefer historical official tables and reports. Use Hebrew and English as useful. No candidate URL list or backend document extraction is supplied. Do not bypass anti-bot restrictions or fabricate URLs. Use trustworthy alternatives if official information is inaccessible, insufficient or outdated, reporting uncertainty honestly.
Return only requested kinds: social_security.reduced_rate_boundary and social_security.max_insurable_income each use {amount} with a positive whole-shekel MONTHLY amount; national_insurance.employee_reduced_rate, national_insurance.employee_standard_rate, health_insurance.employee_reduced_rate and health_insurance.employee_standard_rate each use {rate} with a decimal fraction (1% = 0.01), not percentage points. Preserve these exact names and shapes. Each kind is independently versionable with its own effective timeline. Do not return grouped yearly snapshots or duplicate thresholds under insurance kinds.
Determine rules legally applicable throughout the requested month and report their exact actual validFrom (inclusive) and validTo (exclusive). If a parameter changes inside the month, return both adjacent applicable intervals for that kind. Preserve dates beginning before or extending beyond the requested month; do not clip legal validity to month boundaries or assume changes only happen January 1 or on the first of a month. Convert an inclusive source end to the following day; null validTo only when no legal end is established. An announced future rule is not proof of today's applicability. A publication, capture or retrieval date is not an effective date. Do not extrapolate an annual threshold, carry a rate through an unsupported gap, or invent start dates.
Provide direct quotations with literal values and units, explicit employee context and support for exact effective dates. Amount quotations must identify monthly units. Rate quotations must explicitly identify percentages (including a percent table heading) or decimal fractions, and isolate the employee share, not an ambiguous combined employee/employer row. If only combined NI+Health totals or employer-plus-employee totals are available, do not subtract or derive missing parts: return the missing requested parameter as unresolved. No official_derived trust, inferred value, guessed continuity or reconstructed annual indexation is permitted. Check reduced boundary < maximum income; reduced rates <= corresponding standard rates; compare only simultaneously applicable supported values. Do not invent a missing peer just to perform a consistency check.
Findings need provider grounding attribution for population, kind, value and exact dates, not merely an official-looking URL or model confidence. Missing evidence, conflicting sources or unsupported dates remain unresolved in missingPeriods/notes/conflicts within the requested month; no empty/placeholder value is valid data. Findings are pending-review candidates only; humans approve and activate revisions.`,
};
