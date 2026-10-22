import type {
  NewCandidate,
  RevisionFallbackReason,
} from "../reference-data/ports.ts";
import { candidateProvenance } from "../research/candidate-provenance.ts";
import type {
  DocumentFetcher,
  ExtractionProvider,
  FetchedDocument,
  ResearchProvider,
} from "../research/ports.ts";
import {
  researchReferenceData,
  type ResearchDeps,
  type ResearchResult,
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
  ANNUAL_REPORT_EXTRACTION,
  annualReportUrl,
  EMPLOYEE_TOTAL_HISTORY_EXTRACTION,
  RATE_HISTORY_URL,
  THRESHOLD_HISTORY_EXTRACTION,
  THRESHOLD_HISTORY_URL,
  validateAnnualReportRates,
  validateEmployeeTotalHistory,
  validateThresholdHistory,
} from "./contributions-history.ts";
import {
  addMonths,
  buildContributionTimelines,
  contributionCandidates,
  deriveEvidence,
  employeeTotalSpans,
  monthOf,
  observationEvidence,
  reportEvidence,
  thresholdEvidence,
  type ContributionEvidence,
  type ContributionReading,
  type ContributionTimelines,
  type EmployeeTotalSpan,
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
  readonly label: string;
  readonly year: number;
  readonly result: ResearchResult<unknown>;
};

export type ContributionsResearchReport = {
  readonly researchedAt: string;
  readonly archive:
    | { readonly status: "read"; readonly captures: number }
    | { readonly status: "unavailable"; readonly problem: string };
  readonly secondary: "not_needed" | "used" | "blocked" | "not_found";
  readonly runs: readonly ContributionsResearchRun[];
  readonly readings: readonly ContributionReading[];
  readonly evidence: readonly ContributionEvidence[];
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

type Source<T> = {
  readonly label: string;
  readonly year: number;
  readonly urls: readonly string[];
  /** For PDFs: only pages that mention one of these are read. */
  readonly pageKeywords?: readonly string[];
  readonly extraction: ExtractionProvider;
  readonly validate: (
    raw: unknown,
    document: FetchedDocument,
    year: number,
  ) => T;
  readonly fetcher?: DocumentFetcher;
};

/**
 * Official first, through the generic research pipeline:
 * - the change-point tables of thresholds and employee totals;
 * - the yearly reports' health insurance rates;
 * - for each year from 2015 on, the live rates page (current year) and the
 *   year's latest archived captures of it.
 * Then, where official evidence leaves a month without a value, the employee
 * total minus the other insurance's rate (reported, never stored), and Kol
 * Zchut as it read at the end of each remaining stretch. Builds the timelines
 * and the pending revisions they support; stores and activates nothing.
 */
export async function researchEmployeeContributions(
  deps: ContributionsResearchDeps,
): Promise<ContributionsResearchReport> {
  const clock = deps.now ?? (() => new Date());
  const now = clock();
  const today = now.toISOString().slice(0, 10);
  const currentYear = now.getUTCFullYear();
  const window = { from: RESEARCH_START, until: addMonths(monthOf(today), 1) };

  const runs: ContributionsResearchRun[] = [];
  const readings: ContributionReading[] = [];
  const evidence: ContributionEvidence[] = [];
  const totals: EmployeeTotalSpan[] = [];

  async function read<T>(
    source: Source<T>,
    trust: ContributionReading["trust"],
    observedOn: (result: ResearchResult<T>) => string,
    fallbackReason: RevisionFallbackReason | null = null,
  ): Promise<{ values: T; reading: number } | null> {
    const pipeline: ResearchDeps = {
      research: NO_DISCOVERY,
      fetcher: source.fetcher ?? deps.fetcher,
      extraction: source.extraction,
      artifacts: deps.artifacts,
    };
    const result = await researchReferenceData(
      source.year,
      {
        knownSources: () => source.urls,
        discoverySubject:
          "the employee National Insurance and health insurance rates (שיעורי דמי ביטוח לעובד שכיר)",
        pageKeywords: source.pageKeywords ?? [],
        task: () => CONTRIBUTIONS_TASK,
        validate: source.validate,
      },
      pipeline,
    );
    runs.push({ label: source.label, year: source.year, result });
    const provenance = candidateProvenance(result);
    if (result.candidate === null || provenance === null) return null;
    readings.push({
      label: source.label,
      observedOn: observedOn(result),
      trust,
      provenance: {
        sources: provenance.sources,
        supportingSource: provenance.supportingSource,
        fallbackReason: trust === "official" ? null : fallbackReason,
      },
    });
    return { values: result.candidate.values, reading: readings.length - 1 };
  }
  const retrievedOn = (result: ResearchResult<unknown>) =>
    waybackCaptureDay(result.candidate!.source.finalUrl) ??
    result.candidate!.source.retrievedAt.slice(0, 10);

  const thresholds = await read(
    {
      label: "thresholds change-point table",
      year: currentYear,
      urls: [THRESHOLD_HISTORY_URL],
      extraction: THRESHOLD_HISTORY_EXTRACTION,
      validate: (raw, document) => validateThresholdHistory(raw, document.text),
    },
    "official",
    retrievedOn,
  );
  if (thresholds) {
    evidence.push(...thresholdEvidence(thresholds.values, thresholds.reading));
  }

  const employeeTotals = await read(
    {
      label: "employee totals change-point table",
      year: currentYear,
      urls: [RATE_HISTORY_URL],
      extraction: EMPLOYEE_TOTAL_HISTORY_EXTRACTION,
      validate: (raw, document) =>
        validateEmployeeTotalHistory(raw, document.text),
    },
    "official",
    retrievedOn,
  );
  if (employeeTotals) {
    totals.push(
      ...employeeTotalSpans(employeeTotals.values, employeeTotals.reading),
    );
  }

  const firstYear = Number(RESEARCH_START.slice(0, 4));
  for (let year = firstYear; year < currentYear; year++) {
    const report = await read(
      {
        label: `report ${year}`,
        year,
        urls: [annualReportUrl(year)],
        pageKeywords: ["ביטוח בריאות"],
        extraction: ANNUAL_REPORT_EXTRACTION,
        validate: (raw, document, reportYear) =>
          validateAnnualReportRates(raw, document.text, reportYear),
      },
      "official",
      retrievedOn,
    );
    if (report) evidence.push(...reportEvidence(report.values, report.reading));
  }

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

  const validateClaims = (raw: unknown, document: FetchedDocument) =>
    validateContributionsExtraction(raw, document.text);
  for (let year = firstYear; year <= currentYear; year++) {
    const urls = [
      ...(year === currentYear ? [BTL_EMPLOYEE_RATES_URL] : []),
      ...captures
        .filter((capture) => capture.capturedOn.startsWith(`${year}-`))
        .slice(-CAPTURES_PER_YEAR)
        .reverse()
        .map((capture) => capture.url),
    ];
    if (urls.length === 0) continue;
    const page = await read<ContributionClaims>(
      {
        label: `rates page ${year}`,
        year,
        urls,
        extraction: CONTRIBUTIONS_EXTRACTION,
        validate: validateClaims,
      },
      "official",
      retrievedOn,
    );
    if (page) {
      const { finalUrl } =
        readings[page.reading].provenance.sources[
          readings[page.reading].provenance.supportingSource
        ];
      evidence.push(
        ...observationEvidence(
          {
            observedOn: readings[page.reading].observedOn,
            trust: "official",
            live: waybackCaptureDay(finalUrl ?? "") === null,
            claims: page.values,
          },
          page.reading,
        ),
      );
    }
  }

  evidence.push(...deriveEvidence(evidence, totals));

  const gaps = gapStretches(buildContributionTimelines(evidence, window));
  let secondary: ContributionsResearchReport["secondary"] =
    gaps.length === 0 ? "not_needed" : "not_found";
  for (const gap of gaps) {
    const asOf = [lastDayOf(gap.lastMonth), today].sort()[0];
    const officialThatYear = readings.some(
      (reading) =>
        reading.trust === "official" &&
        reading.label === `rates page ${gap.year}`,
    );
    const runsBefore = runs.length;
    const section = await read<ContributionClaims>(
      {
        label: `Kol Zchut as of ${asOf}`,
        year: gap.year,
        urls: [KOL_ZCHUT_ARTICLE_URL],
        extraction: CONTRIBUTIONS_EXTRACTION,
        validate: validateClaims,
        fetcher: new KolZchutDocumentFetcher(
          deps.kolZchut,
          new Date(`${asOf}T12:00:00.000Z`),
          clock,
        ),
      },
      "secondary",
      () => asOf,
      officialThatYear
        ? "official_source_insufficient"
        : "official_source_not_found",
    );
    if (section) {
      evidence.push(
        ...observationEvidence(
          {
            observedOn: asOf,
            trust: "secondary",
            live: false,
            claims: section.values,
          },
          section.reading,
        ),
      );
      secondary = "used";
    } else if (
      runs
        .slice(runsBefore)
        .some(({ result }) =>
          result.attempts.some(({ outcome }) => outcome === "blocked"),
        )
    ) {
      // Never retried with another client; the remaining stretches stay missing.
      secondary = "blocked";
      break;
    }
  }

  const timelines = buildContributionTimelines(evidence, window);
  return {
    researchedAt: now.toISOString(),
    archive,
    secondary,
    runs,
    readings,
    evidence,
    timelines,
    candidates: contributionCandidates(timelines, evidence, readings),
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
