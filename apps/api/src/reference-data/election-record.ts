import { isDeepStrictEqual } from "node:util";
import { locateQuote, type QuoteMatch } from "../research/evidence.ts";
import type {
  Accessibility,
  DocumentFetcher,
  FetchedDocument,
  SourceTier,
} from "../research/ports.ts";
import { publisherOf, sourceTier } from "../research/source-policy.ts";
import type { ElectionStatus } from "./legacy-seed.ts";
import type {
  ActiveRevision,
  CandidateEvidence,
  CandidateSource,
  NewCandidate,
  RevisionAdministration,
} from "./ports.ts";

const KIND = "calendar.knesset_election";
const DAY_MS = 24 * 60 * 60 * 1000;

/** What an administrator asks to record about one Knesset election. */
export type ElectionRecordRequest = {
  readonly knessetNumber: number;
  /** YYYY-MM-DD */
  readonly date: string;
  readonly status: ElectionStatus;
  readonly sourceUrl: string;
  /** A passage of the source that confirms the record; null when there is none. */
  readonly quote: string | null;
  /**
   * Why the record is entered by hand. Required, and only used, when the
   * source cannot verify it: blocked, not official, or without the quote.
   */
  readonly manualNote: string | null;
};

/** What the command found at the source; the document text is left out. */
export type SourceCheck = {
  readonly url: string;
  readonly finalUrl: string | null;
  /** The worse of the requested and the final address: a redirect off an official host counts. */
  readonly tier: SourceTier;
  /** null when the source was not fetched (general web, tier 4). */
  readonly accessibility: Accessibility | null;
  readonly httpStatus: number | null;
  readonly problem: string | null;
  /** The quote exactly as the source has it; null when it was not found. */
  readonly matchedQuote: string | null;
};

export type ElectionRecordPlan =
  | {
      readonly status: "rejected";
      readonly reason: string;
      readonly source: SourceCheck | null;
    }
  | {
      /** The active revision already says exactly this. */
      readonly status: "unchanged";
      readonly active: ActiveRevision;
      readonly source: SourceCheck;
    }
  | {
      readonly status: "ready";
      readonly candidate: NewCandidate;
      /** The revision activating the candidate would replace. */
      readonly active: ActiveRevision | null;
      readonly source: SourceCheck;
    };

const ACCESS_STATUS: Record<Accessibility, CandidateSource["accessStatus"]> = {
  accessible: "fetched",
  blocked: "blocked",
  not_found: "not_found",
  unsupported_content: "unsupported_content",
  error: "unavailable",
};

/**
 * Builds the candidate revision for one election without storing anything.
 * Trust comes only from what can be proven: an official page (tier 1 or 2)
 * that the backend fetched and that contains the quote is official_verified;
 * anything else needs an explicit manual note and is stored as manual, with
 * the source kept as consulted and its real access status. A blocked page is
 * reported as blocked, never worked around.
 *
 * The quote proves the page says it, not what it means: the person who
 * activates the revision still reads the matched passage.
 */
export async function planElectionRecord(
  request: ElectionRecordRequest,
  deps: {
    readonly fetcher: DocumentFetcher;
    readonly administration: Pick<RevisionAdministration, "findActiveSubject">;
    /** Today in Israel, YYYY-MM-DD. */
    readonly today: string;
  },
): Promise<ElectionRecordPlan> {
  const problem = requestProblem(request, deps.today);
  if (problem !== null)
    return { status: "rejected", reason: problem, source: null };

  const requestedTier = sourceTier(request.sourceUrl);
  const document =
    requestedTier <= 3 ? await deps.fetcher.fetch(request.sourceUrl) : null;
  const tier =
    document === null
      ? requestedTier
      : (Math.max(requestedTier, sourceTier(document.finalUrl)) as SourceTier);
  const match =
    document?.accessibility === "accessible" && request.quote !== null
      ? locateQuote(document.text, request.quote)
      : null;
  const source = sourceCheck(request.sourceUrl, tier, document, match);

  const verified = match !== null && tier <= 2;
  if (!verified && request.manualNote === null) {
    return {
      status: "rejected",
      reason: `${unverifiedReason(source, request.quote)}; record it by hand with a manual note, or use an official source`,
      source,
    };
  }

  const subjectKey = `knesset:${request.knessetNumber}`;
  const candidate: NewCandidate = {
    kind: KIND,
    subjectKey,
    validFrom: request.date,
    validTo: nextDay(request.date),
    value: {
      knessetNumber: request.knessetNumber,
      electionStatus: request.status,
    },
    origin: "manual",
    trust: verified ? "official_verified" : "manual",
    fallbackReason: null,
    sources: [candidateSource(request.sourceUrl, tier, document, verified)],
    evidence: [
      verified
        ? evidence("fetched_verified", request.date, {
            source: 0,
            quote: match.span,
            page: match.page,
          })
        : evidence("manual", request.date, { note: request.manualNote }),
    ],
  };

  const active = await deps.administration.findActiveSubject(KIND, subjectKey);
  if (active !== null && sameRecord(active, candidate)) {
    return { status: "unchanged", active, source };
  }
  return { status: "ready", candidate, active, source };
}

function requestProblem(
  request: ElectionRecordRequest,
  today: string,
): string | null {
  if (!Number.isInteger(request.knessetNumber) || request.knessetNumber < 1) {
    return `invalid Knesset number ${request.knessetNumber}`;
  }
  if (!isCalendarDate(request.date)) return `invalid date ${request.date}`;
  // Polls close in the evening, so an election occurs no sooner than the day after.
  if (request.status === "occurred" && request.date >= today) {
    return `an election on ${request.date} cannot be recorded as occurred on ${today}`;
  }
  if (request.manualNote !== null && request.manualNote.trim() === "") {
    return "a manual note cannot be empty";
  }
  return null;
}

function unverifiedReason(source: SourceCheck, quote: string | null): string {
  if (source.accessibility === null) {
    return `${source.url} is general web (tier ${source.tier}) and was not fetched`;
  }
  if (source.accessibility !== "accessible") {
    return `the source is ${source.accessibility}${source.problem ? ` (${source.problem})` : ""}`;
  }
  if (source.tier > 2)
    return `the source is not official (tier ${source.tier})`;
  if (quote === null) return "no quote was given";
  return "the quote was not found in the source";
}

function sourceCheck(
  url: string,
  tier: SourceTier,
  document: FetchedDocument | null,
  match: QuoteMatch | null,
): SourceCheck {
  return {
    url,
    finalUrl: document?.finalUrl ?? null,
    tier,
    accessibility: document?.accessibility ?? null,
    httpStatus: document?.httpStatus ?? null,
    problem: document?.problem ?? null,
    matchedQuote: match?.span ?? null,
  };
}

function candidateSource(
  url: string,
  tier: SourceTier,
  document: FetchedDocument | null,
  supporting: boolean,
): CandidateSource {
  const fetched = document?.accessibility === "accessible";
  return {
    url,
    finalUrl: document?.finalUrl ?? null,
    publisher: document?.publisher ?? publisherOf(url),
    tier,
    discoveredVia: "manual",
    accessStatus: document
      ? ACCESS_STATUS[document.accessibility]
      : "not_fetched",
    httpStatus: document?.httpStatus ?? null,
    contentType: document?.contentType ?? null,
    title: document?.title ?? null,
    sha256: fetched ? document.sha256 : null,
    grounding: null,
    fetchAttemptedAt: document?.retrievedAt ?? null,
    role: supporting ? "supporting" : "consulted",
  };
}

function evidence(
  evidenceType: "fetched_verified" | "manual",
  effectiveFrom: string,
  fields: Partial<
    Pick<CandidateEvidence, "source" | "quote" | "page" | "note">
  >,
): CandidateEvidence {
  return {
    evidenceType,
    source: null,
    carriedFromRevisionId: null,
    quote: null,
    section: null,
    sourceReference: null,
    page: null,
    effectiveFrom,
    grounding: null,
    note: null,
    ...fields,
  };
}

function sameRecord(active: ActiveRevision, candidate: NewCandidate): boolean {
  return (
    active.validFrom === candidate.validFrom &&
    active.validTo === candidate.validTo &&
    active.trust === candidate.trust &&
    isDeepStrictEqual(active.value, candidate.value)
  );
}

function isCalendarDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const time = Date.parse(`${date}T00:00:00Z`);
  // Rejects dates that do not exist, such as 2026-02-30.
  return !Number.isNaN(time) && new Date(time).toISOString().startsWith(date);
}

function nextDay(date: string): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + DAY_MS)
    .toISOString()
    .slice(0, 10);
}

/** The calendar date in Israel at an instant, YYYY-MM-DD. */
export function israelDate(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jerusalem",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
