import { z } from "zod";
import type {
  ResearchFinding,
  ResearchSpec,
  ResearchTask,
} from "../contracts.ts";

const money = z.number().positive().multipleOf(0.01);
export const perDiemValueSchema = z.strictObject({ amount: money });
export const mealAllowanceValueSchema = z.strictObject({
  small: money,
  large: money,
});

/** Exact currency token, allowing separators/trailing zeroes but not a prefix of another amount. */
const amountAppearsIn = (quote: string, amount: number): boolean => {
  const [whole, decimals] = String(amount).split(".");
  const token = decimals ? `${whole}\\.${decimals}0*` : `${whole}(?:\\.0+)?`;
  const currency = '(?:₪|ILS|NIS|shekels?|ש[״"]ח)';
  return new RegExp(
    `(?:${currency}\\s*(?<![\\d.-])${token}(?!\\d|\\.\\d)|(?<![\\d.-])${token}(?!\\d|\\.\\d)\\s*${currency})`,
    "iu",
  ).test(quote.replace(/(\d),(?=\d{3})/g, "$1"));
};

const SMALL_CATEGORY = /26\.284|1476|משמרת (?:השלישית|שלישית)|third shift/iu;
const LARGE_CATEGORY =
  /26\.282|(?:2|שתי|שעתיים)\s*שעות נוספות|שעתיים נוספות|(?:two|2) overtime hours/iu;
const CATEGORY_A = /\b(?:category|tier)\s+A\b|תעריף\s*א[׳'״"]?/iu;

/** Ambiguous flattened tables remain unresolved, rather than matching a value in another row. */
const categoryAmountAppearsIn = (
  quote: string,
  category: RegExp,
  other: RegExp,
  amount: number,
): boolean =>
  quote
    .split(/[;\r\n]/)
    .some(
      (row) =>
        category.test(row) && !other.test(row) && amountAppearsIn(row, amount),
    );

/** Preserve the existing civil-service rate families, not universal employee entitlements. */
export const validateAllowanceFinding = (
  finding: ResearchFinding,
  task: ResearchTask,
): readonly string[] => {
  if (
    task.request.requestUnit !== "calendar_month" ||
    task.request.domain !== "allowances" ||
    !task.request.parameters.includes(finding.kind) ||
    finding.subjectKey !== null
  )
    return ["Allowances require an explicitly requested month and parameter"];
  // Published allowance timelines/calculators require month boundaries. Never round legal dates.
  if (
    !finding.validFrom.endsWith("-01") ||
    (finding.validTo !== null && !finding.validTo.endsWith("-01"))
  )
    return [
      `Unsupported allowance interval ${finding.validFrom}..${finding.validTo ?? "open"}: intramonth validity requires a separately approved consumer migration`,
    ];
  const quote = finding.quote;
  if (!/\b(?:ILS|NIS|shekels?)\b|₪|ש[״"]ח/iu.test(quote))
    return ["The supporting quotation must identify ILS amounts"];
  if (
    !/\bcivil[- ]service\b|\bstate employees\b|עובדי (?:המדינה|מדינה)|תקשי[״"]ר/iu.test(
      quote,
    )
  )
    return [
      "Evidence must identify the existing Israeli civil-service allowance regime",
    ];
  if (
    /\b(?:derived|estimated|extrapolated)\b|נגזר|נאמד|אקסטרפולציה/iu.test(quote)
  )
    return ["Derived or extrapolated allowances remain unresolved"];
  if (finding.kind === "per_diem.point_rate") {
    const parsed = perDiemValueSchema.safeParse(finding.value);
    if (!parsed.success) return ["Invalid per-diem point amount"];
    if (!CATEGORY_A.test(quote))
      return [
        "Per-diem evidence must identify duty category A, not another meal or travel tariff",
      ];
    return categoryAmountAppearsIn(
      quote,
      CATEGORY_A,
      /\b(?:category|tier)\s+[BC]\b|תעריף\s*[בג][׳'״"]?/iu,
      parsed.data.amount,
    )
      ? []
      : [
          "The literal category A amount is absent or belongs to an ambiguous row",
        ];
  }
  if (finding.kind !== "meal_allowance.rates")
    return ["Unsupported allowance parameter"];
  const parsed = mealAllowanceValueSchema.safeParse(finding.value);
  if (!parsed.success)
    return ["Both independently supported meal amounts are required"];
  // Labels identify the existing small/large mapping; provider attribution still has to support each field.
  if (!SMALL_CATEGORY.test(quote) || !LARGE_CATEGORY.test(quote))
    return [
      "Meal evidence must identify third-shift small and ordinary overtime large categories",
    ];
  if (/without (?:a )?meal agreement|ללא הסכם ארוחות/iu.test(quote))
    return [
      "An ambiguous no-meal-agreement category must not replace the ordinary large meal rate",
    ];
  return categoryAmountAppearsIn(
    quote,
    SMALL_CATEGORY,
    LARGE_CATEGORY,
    parsed.data.small,
  ) &&
    categoryAmountAppearsIn(
      quote,
      LARGE_CATEGORY,
      SMALL_CATEGORY,
      parsed.data.large,
    )
    ? []
    : [
        "Both literal meal amounts must be present; no stored or inferred counterpart is allowed",
      ];
};

export const ALLOWANCES_RESEARCH_SPEC: ResearchSpec = {
  id: "reference:allowances",
  version: 1,
  domain: "allowances",
  population:
    "Israeli civil-service allowance rate families documented by Shiftly; entitlement and employer applicability reviewed separately",
  sourcePriority: [
    "Ministry of Finance Wage and Labor Agreements Department official circulars",
    "Official Civil Service Commission / Takshir publications",
    "Other official Israeli government publications",
    "Identified reproductions of official circulars and trusted payroll publications",
    "Other reliable search results",
  ],
  refreshPolicy: { intervalDays: 90, unresolvedDays: 30 },
  validateFinding: validateAllowanceFinding,
  researchInstructions: `Research only the exact year, month and requested parameters. The existing Shiftly families are Israeli civil-service duty per diem (קצובת אש״ל) and meal allowance (דמי כלכלה), not universal Israeli employee entitlements. Research begins November 2015; verified history is skipped by the backend. Do not batch several months or launch further model calls.
Prioritize Ministry of Finance Wage and Labor Agreements Department circulars, then Civil Service Commission/Takshir, official government publications, identified reproductions of official circulars/trusted payroll sources, then reliable alternatives. Discover sources through Google Search, not preselected URLs. Never bypass anti-bot restrictions. Use reliable alternatives if official sources are inaccessible, and report uncertainty rather than inventing citations or amounts. A circular establishes this rate family, not whether every employer/employee is entitled to it.
per_diem.point_rate uses {amount}: the literal ILS duty category A (תעריף א׳) amount for one point. Do not substitute duty categories B/C, meal-by-meal per diem, domestic/foreign travel reimbursement, tax exemption ceilings, employer-specific benefits or a total allowance. Do not derive A from B/C or change the deterministic calculator's existing point multipliers or entitlement rules.
meal_allowance.rates uses {small,large}: small is the third-shift category for at least four hours (Takshir 26.284, payroll code 1476); large is the ordinary category for at least two overtime hours (Takshir 26.282, payroll code 1700). The separate WITHOUT-meal-agreement category is NOT large. Both amounts are positive ILS per applicable allowance, not monthly totals, percentages or personal point counts. Preserve exact existing kinds and schemas.
Every meal finding must independently support BOTH amounts, their correct categories and the complete tuple's effective interval. Preserve distinct source rows/clauses for the categories with original newline/semicolon boundaries and currency attached to each amount; ambiguously flattened tables must remain unresolved, not be reformatted into fabricated quotations. Payroll code 1700 alone cannot distinguish ordinary versus no-meal-agreement rates, so require the ordinary category's section/description. If only small or only large is supported, return the kind unresolved; never copy a current stored value, guess an unchanged counterpart, reuse an outdated table or invent a new kind. When one component actually changes and the other is explicitly still supported, return the newly applicable full pair at the real change date. Different component histories may produce different tuple intervals, not monthly snapshots. A single finding's attributed source must support both amounts; if this cannot be established, report unresolved rather than implying combined evidence.
Request exact legal validFrom (inclusive) and validTo (exclusive), retaining actual boundaries before/after the requested month. Publication/capture/retrieval dates are not effective dates. Never invent January 1 starts, copy provisional baseline dates or extrapolate inflation/indexation. Previous-rate comparison columns prove only the periods they explicitly support, not an invented start date. Conflicting retrospective columns must be reported, not silently corrected as typos. Baseline values are comparison context, not evidence.
Current allowance consumers only support first-of-month effective boundaries. If either actual boundary is inside a month, do NOT round or clip it and do not create an unsupported candidate: report the affected period as missing/unresolved, including the actual legal dates and required consumer migration in the missing-period reason (and notes). This limitation does not apply to the other research domains. Where month-aligned intervals are fully supported, return actual tuple/point validity, never redundant monthly copies.
Each finding needs a direct quotation with civil-service context, ILS units, explicit category labels, literal amounts and support for exact effective dates. For meal findings isolate the ordinary overtime and third-shift categories rather than an ambiguous no-agreement column. Provider grounding must attribute every field to that source. A model quotation, official-looking URL or JSON structure alone is not independent verification. Findings are candidates only; human approval and existing publication validation are mandatory.`,
};
