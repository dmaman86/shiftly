import { z } from "zod";
import { appearsIn, percentNumberAppearsIn } from "../shared/grounding.ts";
import { RulesPipelineError } from "../shared/errors.ts";
import { failOn } from "../shared/validation.ts";
import {
  dateFromStatement,
  flatten,
  yearLimitOfStatement,
} from "./contributions-extraction.ts";
import {
  CONTRIBUTION_PARAMETERS,
  contributionValue,
  isAmountParameter,
  type ContributionClaim,
  type ContributionClaims,
  type ContributionParameter,
} from "./employee-contributions.ts";

// Timelines change on the first of a month; any other date cannot be stored.
const monthStart = z.string().regex(/^\d{4}-\d{2}-01$/);

const claimSchema = z.strictObject({
  value: z.number().positive().finite(),
  statedFrom: monthStart.nullable(),
  statedUntil: monthStart.nullable(),
  statedFromText: z.string().min(1).nullable(),
  // The store rejects shorter quotes.
  quote: z.string().min(12),
  statedFromQuote: z.string().min(12).nullable(),
});
type RawClaim = z.infer<typeof claimSchema>;

const extractionSchema = z.discriminatedUnion("status", [
  z.strictObject({
    status: z.literal("complete"),
    parameters: z.strictObject(
      Object.fromEntries(
        CONTRIBUTION_PARAMETERS.map((parameter) => [parameter, claimSchema]),
      ) as Record<ContributionParameter, typeof claimSchema>,
    ),
    totals: z.strictObject({
      reduced: claimSchema.nullable(),
      standard: claimSchema.nullable(),
    }),
    annualMaxUpdate: z.string().min(12).nullable(),
  }),
  z.strictObject({
    status: z.literal("unclear"),
    problems: z.array(z.string()),
  }),
]);

// Rates are written with two decimals, so parts and total agree to 0.0001.
const RATE_TOLERANCE = 0.00005;

const PARTS = {
  reduced: ["nationalInsuranceReducedRate", "healthInsuranceReducedRate"],
  standard: ["nationalInsuranceStandardRate", "healthInsuranceStandardRate"],
} as const;

/**
 * The validator, not the parser, decides whether a reading is usable: shape,
 * range, internal consistency, and that every value, quote and date is
 * literally in the text that was read.
 */
export function validateContributionsExtraction(
  raw: unknown,
  sourceText: string,
): ContributionClaims {
  const parsed = extractionSchema.safeParse(raw);
  if (!parsed.success) {
    throw new RulesPipelineError(
      "invalid_extraction",
      "Extraction does not match the schema",
      { issues: parsed.error.issues },
    );
  }
  if (parsed.data.status === "unclear") {
    throw new RulesPipelineError(
      "extraction_unclear",
      "The employee rates could not be read from the source",
      { problems: parsed.data.problems },
    );
  }
  const { parameters, totals, annualMaxUpdate } = parsed.data;
  const text = flatten(sourceText);
  const inText = (quote: string) => text.includes(flatten(quote));

  const problems: string[] = [];
  for (const parameter of CONTRIBUTION_PARAMETERS) {
    problems.push(...claimProblems(parameter, parameters[parameter], inText));
  }
  if (
    parameters.reducedRateBoundary.value >= parameters.maxInsurableIncome.value
  ) {
    problems.push("reducedRateBoundary must be below maxInsurableIncome");
  }
  for (const part of ["reduced", "standard"] as const) {
    const total = totals[part];
    if (total === null) continue;
    const [nationalInsurance, health] = PARTS[part].map(
      (parameter) => parameters[parameter],
    );
    // A total only checks parts already in force on its own date: a total
    // "from January" says nothing about a part that starts in February.
    const { statedFrom } = total;
    if (
      statedFrom !== null &&
      [nationalInsurance, health].some(
        (part) => part.statedFrom !== null && part.statedFrom > statedFrom,
      )
    ) {
      continue;
    }
    if (
      !inText(total.quote) ||
      !percentNumberAppearsIn(total.quote)(total.value)
    ) {
      problems.push(`${part} total ${total.value} is not in the source`);
    } else if (
      Math.abs(nationalInsurance.value + health.value - total.value) >
      RATE_TOLERANCE
    ) {
      problems.push(
        `${part}: national insurance + health must equal the stated total`,
      );
    }
  }
  if (annualMaxUpdate !== null && !inText(annualMaxUpdate)) {
    problems.push("the annual update statement is not in the source");
  }
  failOn(problems);

  return {
    claims: Object.fromEntries(
      CONTRIBUTION_PARAMETERS.map((parameter) => {
        const { value, statedFrom, statedUntil, quote, statedFromQuote } =
          parameters[parameter];
        const claim: ContributionClaim = {
          value,
          statedFrom,
          statedUntil,
          quote: flatten(quote),
          statedFromQuote:
            statedFromQuote === null ? null : flatten(statedFromQuote),
        };
        return [parameter, claim];
      }),
    ) as Record<ContributionParameter, ContributionClaim>,
    annualMaxUpdate: annualMaxUpdate === null ? null : flatten(annualMaxUpdate),
  };
}

function claimProblems(
  parameter: ContributionParameter,
  claim: RawClaim,
  inText: (quote: string) => boolean,
): string[] {
  const problems: string[] = [];
  try {
    contributionValue(parameter, claim.value);
  } catch {
    problems.push(`${parameter} ${claim.value} is out of range`);
  }
  const appears = isAmountParameter(parameter)
    ? appearsIn(claim.quote)(String(claim.value))
    : percentNumberAppearsIn(claim.quote)(claim.value);
  if (!inText(claim.quote) || !appears) {
    problems.push(`${parameter} ${claim.value} is not in the source`);
  }

  const { statedFrom, statedUntil, statedFromText, statedFromQuote } = claim;
  if (statedFrom === null) {
    if (statedFromText !== null || statedUntil !== null) {
      problems.push(`${parameter}: "${statedFromText}" is not a month start`);
    }
    return problems;
  }
  if (
    statedFromText === null ||
    statedFromQuote === null ||
    !inText(statedFromQuote) ||
    !flatten(statedFromQuote).includes(flatten(statedFromText)) ||
    dateFromStatement(statedFromText) !== statedFrom
  ) {
    problems.push(
      `${parameter}: start date ${statedFrom} is not in the source`,
    );
  } else if (yearLimitOfStatement(statedFromText) !== statedUntil) {
    problems.push(`${parameter}: end date ${statedUntil} is not in the source`);
  }
  return problems;
}
