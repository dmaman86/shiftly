import type {
  NewCandidate,
  RevisionFallbackReason,
} from "../reference-data/ports.ts";
import { candidateProvenance } from "../research/candidate-provenance.ts";
import type { DocumentFetcher, ResearchProvider } from "../research/ports.ts";
import {
  researchReferenceData,
  type ResearchDeps,
  type ResearchResult,
  type ResearchSpec,
} from "../research/research-pipeline.ts";
import {
  waybackCaptureDay,
  type ArchiveIndex,
} from "../research/web-archive.ts";
import type { DebugArtifactStore } from "../shared/debug-artifacts.ts";
import {
  CONTRIBUTIONS_EXTRACTION,
  CONTRIBUTIONS_TASK,
} from "./contributions-extraction.ts";
import {
  addMonths,
  buildContributionTimelines,
  contributionCandidates,
  monthOf,
  type ContributionTimelines,
  type ResearchedObservation,
} from "./contributions-timeline.ts";
import { validateContributionsExtraction } from "./contributions-validation.ts";
import type { ContributionClaims } from "./employee-contributions.ts";
import { KolZchutDocumentFetcher } from "./kolzchut-document-fetcher.ts";
import type { SocialSecuritySourceProvider } from "./social-security-source.ts";

/** The National Insurance Institute's employee rates page (tier 1). */
export const BTL_EMPLOYEE_RATES_URL = `https://www.btl.gov.il/Insurance/Rates/Pages/${encodeURIComponent("לעובדים שכירים")}.aspx`;

/** Kol Zchut's article on employee contributions (tier 3). */
export const KOL_ZCHUT_ARTICLE_URL = `https://www.kolzchut.org.il/he/${encodeURIComponent("דמי_ביטוח_לאומי_לעובד_שכיר")}`;

/** Shiftly's first supported month. */
export const RESEARCH_START = "2015-11-01";

/** Captures read per year at most, latest first: the latest covers the most months. */
const CAPTURES_PER_YEAR = 3;

export type ContributionsResearchDeps = {
  readonly fetcher: DocumentFetcher;
  readonly archive: ArchiveIndex;
  readonly kolZchut: SocialSecuritySourceProvider;
  readonly artifacts: DebugArtifactStore;
  readonly now?: () => Date;
};

export type ContributionsResearchRun = {
  readonly year: number;
  readonly purpose: "official" | "secondary";
  /** The day a secondary source was read as of; null for official runs. */
  readonly asOf: string | null;
  readonly result: ResearchResult<ContributionClaims>;
};

export type ContributionsResearchReport = {
  readonly researchedAt: string;
  readonly archive:
    | { readonly status: "read"; readonly captures: number }
    | { readonly status: "unavailable"; readonly problem: string };
  /** Years with no official page or capture to read, or none that validated. */
  readonly yearsWithoutOfficialReading: readonly number[];
  readonly secondary: "not_needed" | "used" | "blocked" | "not_found";
  readonly runs: readonly ContributionsResearchRun[];
  readonly observations: readonly ResearchedObservation[];
  readonly timelines: ContributionTimelines;
  /** Pending revisions this research would store; nothing is stored here. */
  readonly candidates: readonly NewCandidate[];
};

/**
 * The sources are known, so the pipeline never searches: if every known
 * source fails, the run is unresolved instead of asking a model for URLs.
 */
const NO_DISCOVERY: ResearchProvider = {
  async discover() {
    return {
      sources: [],
      searchQueries: [],
      call: {
        model: "none",
        startedAt: new Date().toISOString(),
        durationMs: 0,
        outcome: "provider_error",
        httpStatus: null,
        error: "discovery is not used: employee contribution sources are known",
      },
      rawText: null,
    };
  },
};

const contributionsSpec = (
  urls: readonly string[],
): ResearchSpec<ContributionClaims> => ({
  knownSources: () => urls,
  discoverySubject:
    "the employee National Insurance and health insurance rates (שיעורי דמי ביטוח לעובד שכיר)",
  pageKeywords: [],
  task: () => CONTRIBUTIONS_TASK,
  validate: (raw, document) =>
    validateContributionsExtraction(raw, document.text),
});

/**
 * Official first: for each year from 2015 on, the live page (current year)
 * and the year's latest archived captures of it, through the generic
 * research pipeline. Then, only for months no official reading covers, Kol
 * Zchut as it read at the end of each such stretch. Builds the timelines and
 * the pending revisions they support; stores and activates nothing.
 */
export async function researchEmployeeContributions(
  deps: ContributionsResearchDeps,
): Promise<ContributionsResearchReport> {
  const clock = deps.now ?? (() => new Date());
  const now = clock();
  const today = now.toISOString().slice(0, 10);
  const window = { from: RESEARCH_START, until: addMonths(monthOf(today), 1) };
  const pipeline = (fetcher: DocumentFetcher): ResearchDeps => ({
    research: NO_DISCOVERY,
    fetcher,
    extraction: CONTRIBUTIONS_EXTRACTION,
    artifacts: deps.artifacts,
  });

  let archive: ContributionsResearchReport["archive"];
  let captures: Awaited<ReturnType<ArchiveIndex["snapshots"]>> = [];
  try {
    captures = await deps.archive.snapshots(BTL_EMPLOYEE_RATES_URL);
    archive = { status: "read", captures: captures.length };
  } catch (error) {
    archive = {
      status: "unavailable",
      problem: error instanceof Error ? error.message : String(error),
    };
  }

  const runs: ContributionsResearchRun[] = [];
  const observations: ResearchedObservation[] = [];
  const yearsWithoutOfficialReading: number[] = [];
  const currentYear = now.getUTCFullYear();
  for (
    let year = Number(RESEARCH_START.slice(0, 4));
    year <= currentYear;
    year++
  ) {
    const urls = [
      ...(year === currentYear ? [BTL_EMPLOYEE_RATES_URL] : []),
      ...captures
        .filter((capture) => capture.capturedOn.startsWith(`${year}-`))
        .slice(-CAPTURES_PER_YEAR)
        .reverse()
        .map((capture) => capture.url),
    ];
    if (urls.length === 0) {
      yearsWithoutOfficialReading.push(year);
      continue;
    }
    const result = await researchReferenceData(
      year,
      contributionsSpec(urls),
      pipeline(deps.fetcher),
    );
    runs.push({ year, purpose: "official", asOf: null, result });
    const observation = observationOf(result, "official", null, null);
    if (observation) observations.push(observation);
    else yearsWithoutOfficialReading.push(year);
  }

  const gaps = gapStretches(buildContributionTimelines(observations, window));
  let secondary: ContributionsResearchReport["secondary"] =
    gaps.length === 0 ? "not_needed" : "not_found";
  for (const gap of gaps) {
    const asOf = [lastDayOf(gap.lastMonth), today].sort()[0];
    const result = await researchReferenceData(
      gap.year,
      contributionsSpec([KOL_ZCHUT_ARTICLE_URL]),
      pipeline(
        new KolZchutDocumentFetcher(
          deps.kolZchut,
          new Date(`${asOf}T12:00:00.000Z`),
          clock,
        ),
      ),
    );
    runs.push({ year: gap.year, purpose: "secondary", asOf, result });
    const officialThatYear = observations.some(
      (observation) =>
        observation.trust === "official" &&
        observation.observedOn.startsWith(`${gap.year}-`),
    );
    const observation = observationOf(
      result,
      "secondary",
      asOf,
      officialThatYear
        ? "official_source_insufficient"
        : "official_source_not_found",
    );
    if (observation) {
      observations.push(observation);
      secondary = "used";
    } else if (result.attempts.some(({ outcome }) => outcome === "blocked")) {
      // Never retried with another client; the remaining stretches stay missing.
      secondary = "blocked";
      break;
    }
  }

  const timelines = buildContributionTimelines(observations, window);
  return {
    researchedAt: now.toISOString(),
    archive,
    yearsWithoutOfficialReading,
    secondary,
    runs,
    observations,
    timelines,
    candidates: contributionCandidates(timelines, observations),
  };
}

function observationOf(
  result: ResearchResult<ContributionClaims>,
  trust: ResearchedObservation["trust"],
  asOf: string | null,
  fallbackReason: RevisionFallbackReason | null,
): ResearchedObservation | null {
  const provenance = candidateProvenance(result);
  if (result.candidate === null || provenance === null) return null;
  const { source, values } = result.candidate;
  return {
    observedOn:
      asOf ??
      waybackCaptureDay(source.finalUrl) ??
      source.retrievedAt.slice(0, 10),
    trust,
    live: trust === "official" && source.tier === 1,
    claims: values,
    provenance: {
      sources: provenance.sources,
      supportingSource: provenance.supportingSource,
      fallbackReason: trust === "official" ? null : fallbackReason,
    },
  };
}

/**
 * Months without any evidence for at least one parameter, as stretches that
 * never cross a year, so each is read as of its own year's end.
 */
function gapStretches(
  timelines: ContributionTimelines,
): { year: number; lastMonth: string }[] {
  const months = new Set<string>();
  for (const gap of timelines.missing) {
    if (gap.reason !== "no_evidence") continue;
    for (
      let month = gap.validFrom;
      month < gap.validTo;
      month = addMonths(month, 1)
    ) {
      months.add(month);
    }
  }
  const stretches: { year: number; lastMonth: string }[] = [];
  for (const month of [...months].sort()) {
    const year = Number(month.slice(0, 4));
    const last = stretches[stretches.length - 1];
    if (last && last.year === year && addMonths(last.lastMonth, 1) === month) {
      last.lastMonth = month;
    } else {
      stretches.push({ year, lastMonth: month });
    }
  }
  return stretches;
}

const lastDayOf = (month: string) => {
  const next = new Date(`${addMonths(month, 1)}T00:00:00Z`);
  next.setUTCDate(0);
  return next.toISOString().slice(0, 10);
};
