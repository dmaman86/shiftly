import { z } from "zod";
import {
  calendarDateSchema,
  type ResearchFinding,
  type ResearchTask,
  type ResearchSpec,
  type ResearchRevision,
  type ResearchRequest,
} from "../contracts.ts";

export const electionValueSchema = z.strictObject({
  knessetNumber: z.number().int().positive().max(Number.MAX_SAFE_INTEGER),
  electionStatus: z.enum(["planned", "confirmed", "occurred", "cancelled"]),
});

const nextDay = (date: string): string =>
  new Date(Date.parse(`${date}T00:00:00Z`) + 86_400_000)
    .toISOString()
    .slice(0, 10);

const recordProblems = (
  record: Pick<
    ResearchRevision,
    "kind" | "subjectKey" | "validFrom" | "validTo" | "value"
  >,
  today: string,
): string[] => {
  const value = electionValueSchema.safeParse(record.value);
  if (!value.success) return ["Invalid election value"];
  if (
    record.kind !== "calendar.knesset_election" ||
    record.subjectKey !== `knesset:${value.data.knessetNumber}`
  )
    return ["Election identity mismatch"];
  if (
    !calendarDateSchema.safeParse(record.validFrom).success ||
    record.validTo !== nextDay(record.validFrom)
  )
    return ["An election must cover exactly its calendar day"];
  if (value.data.electionStatus === "occurred" && record.validFrom >= today)
    return ["Occurrence cannot be recorded before the following day in Israel"];
  return [];
};

/** Conservative textual admission, not an independent semantic verification of the source. */
export const validateElectionFinding = (
  finding: ResearchFinding,
  task: ResearchTask,
): readonly string[] => {
  if (
    task.request.requestUnit !== "subject" ||
    finding.subjectKey !== task.request.subjectKey
  )
    return ["Election subject mismatch"];
  const problems = recordProblems(finding, task.asOfDate);
  if (problems.length) return problems;
  const { electionStatus } = electionValueSchema.parse(finding.value);
  const quote = finding.quote.replace(/\s+/g, " ");
  // A date in the past, announcement or hypothetical is never an occurrence claim.
  const uncertain =
    /\b(?:not|never|may|might|if|would|will|expected|scheduled|postponed)\b|לא\s+(?:התקיימו|נערכו|בוטלו)|(?:צפויות|צפויים|עתידות|עתידים|יתקיימו|ייערכו|אם\s+)/iu;
  if (
    electionStatus === "occurred" &&
    (uncertain.test(quote) ||
      !/(?:הבחירות[\s\S]{0,100}(?:התקיימו|נערכו)|(?:התקיימו|נערכו)[\s\S]{0,100}הבחירות|\belections?\b[\s\S]{0,100}\b(?:was|were) held\b|\bvoting took place\b)/iu.test(
        quote,
      ))
  ) {
    return [
      "Explicit affirmative evidence that the election took place is required",
    ];
  }
  if (
    electionStatus === "cancelled" &&
    (/(?:\b(?:not|may|might|if|would|will)\b|לא\s+בוטל|יבוטל|תבוטל)/iu.test(
      quote,
    ) ||
      !/(?:בוטל[הו]?|\bcancell?ed\b)/iu.test(quote))
  ) {
    return ["Explicit affirmative cancellation evidence is required"];
  }
  return [];
};

export const isFinalElectionRevision = (
  revision: ResearchRevision,
  today: string,
): boolean => {
  if (
    !revision.sufficientEvidence ||
    ![
      "official_verified",
      "official_grounded",
      "secondary_verified",
      "secondary_grounded",
    ].includes(revision.trust) ||
    recordProblems(revision, today).length > 0
  )
    return false;
  const value = electionValueSchema.parse(revision.value);
  return (
    value.electionStatus === "occurred" || value.electionStatus === "cancelled"
  );
};

export const ELECTION_RESEARCH_SPEC: ResearchSpec = {
  id: "reference:elections",
  version: 1,
  domain: "elections",
  population: "Israeli national Knesset elections",
  sourcePriority: [
    "Central Elections Committee",
    "Knesset",
    "Official Israeli government publications",
    "Trusted secondary sources",
    "Broader Google Search",
  ],
  refreshPolicy: { intervalDays: 7, unresolvedDays: 7 },
  isFinalRevision: isFinalElectionRevision,
  validateFinding: validateElectionFinding,
  researchInstructions: `Research only the requested knesset:<number> subject. Search in Hebrew and English as useful. Discover sources yourself; no candidate URL list is supplied.
Determine the official election date and whether its current status is planned, confirmed, occurred or cancelled. Planned means a proposed/expected date; confirmed requires an officially fixed date. A past scheduled date never proves occurred. For occurred, supply an affirmative quotation explicitly stating that the election was held (not merely scheduled, postponed, hypothetical or expected). For cancelled, supply an affirmative cancellation quotation. Prefer a short direct quotation in Hebrew or English; unsupported/ambiguous claims remain unresolved for human review.
A changed date is another revision of the same subject, never a persistent rescheduled status. Return the existing value schema {knessetNumber,electionStatus}, validFrom equal to the election day, and validTo equal to the following calendar day. Do not identify the subject by its date. Do not return an empty or guessed value when no record is found: return no findings and explain uncertainty in notes/conflicts.
Report changes, postponements and contradictory announcements honestly. Prioritize the Central Elections Committee, then Knesset, government, trusted secondary and general search. Do not invent votes<number> URLs or assume an official page exists. An official-looking URL, model confidence or quotation alone is not independent verification. Google provider attribution must support the identity, date and status. Findings are only candidates; a human activates any revision.`,
};

/** An explicit bounded universe, never inferred dates or an unbounded crawl of all Knessets. */
export const electionRequests = (
  first: number,
  last: number,
): readonly ResearchRequest[] => {
  if (
    !Number.isSafeInteger(first) ||
    !Number.isSafeInteger(last) ||
    first < 1 ||
    last < first ||
    last - first >= 100
  )
    throw new Error("Invalid bounded Knesset range");
  return Array.from({ length: last - first + 1 }, (_, index) => ({
    requestUnit: "subject",
    domain: "elections",
    subjectKey: `knesset:${first + index}`,
    parameters: ["calendar.knesset_election"],
  }));
};
