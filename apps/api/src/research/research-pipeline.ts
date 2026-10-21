import type {
  DebugArtifactStore,
  DebugArtifactWriter,
} from "../shared/debug-artifacts.ts";
import { RulesPipelineError } from "../shared/errors.ts";
import type { ExtractionTask } from "../shared/extraction-task.ts";
import { isLlmTrace, type LlmTrace } from "../shared/gemma-extractor.ts";
import type {
  Accessibility,
  DiscoveredSource,
  DocumentFetcher,
  ExtractionProvider,
  FetchedDocument,
  ModelCall,
  ResearchProvider,
  SourceTier,
} from "./ports.ts";
import { pagesMentioning } from "./document-text.ts";
import { byTier, isUsableTier, sourceTier } from "./source-policy.ts";

/** What one data type plugs into the pipeline. */
export type ResearchSpec<T> = {
  /** Official URLs to try before any search, best first. */
  readonly knownSources: (year: number) => readonly string[];
  /** What discovery searches for, in plain words. */
  readonly discoverySubject: string;
  /**
   * PDF pages the model reads must contain one of these; the other pages are
   * left out, so a 30-page booklet costs a few pages of input.
   */
  readonly pageKeywords: readonly string[];
  readonly task: (year: number) => ExtractionTask;
  /** Throws a RulesPipelineError when the extraction cannot be trusted. */
  readonly validate: (
    raw: unknown,
    document: FetchedDocument,
    year: number,
  ) => T;
};

export type ResearchDeps = {
  readonly research: ResearchProvider;
  readonly fetcher: DocumentFetcher;
  readonly extraction: ExtractionProvider;
  readonly artifacts: DebugArtifactStore;
};

/** Model extractions per run, across all sources; each one is a paid call. */
export const MAX_EXTRACTIONS = 3;
/**
 * Larger texts are not sent to the model. The free tier allows 16,000 input
 * tokens a minute for gemma-4-31b-it (seen live), about 45,000 Hebrew characters.
 */
export const MAX_EXTRACTION_CHARACTERS = 30_000;

export type AttemptOutcome =
  | "validated"
  | Exclude<Accessibility, "accessible">
  | "skipped_untrusted_tier"
  | "skipped_extraction_limit"
  | "no_relevant_content"
  | "document_too_large"
  | "extraction_failed"
  | "extraction_unclear"
  | "invalid_extraction";

export type SourceAttempt = {
  readonly origin: "known" | "discovery";
  /** How the URL was found; only search metadata can back grounded evidence. */
  readonly discoveredVia: "known_source" | DiscoveredSource["origin"];
  /** The search result title (usually the domain); null for known sources. */
  readonly searchTitle: string | null;
  readonly requestedUrl: string;
  readonly finalUrl: string | null;
  /** Tier of the final URL after redirects; a redirect cannot raise the tier. */
  readonly tier: SourceTier;
  readonly publisher: string | null;
  readonly httpStatus: number | null;
  readonly retrievedAt: string | null;
  readonly sha256: string | null;
  readonly contentType: string | null;
  readonly title: string | null;
  readonly outcome: AttemptOutcome;
  readonly problems: readonly string[];
};

export type FallbackReason =
  | "official_source_blocked"
  | "official_source_not_found"
  /** The model call failed (provider errors); the source itself may be fine. */
  | "official_extraction_failed"
  /** The validator rejected what the model read from the official source. */
  | "official_source_rejected";

export type ResearchResult<T> = {
  readonly year: number;
  readonly status: "validated" | "unresolved";
  /** A validated candidate; nothing is activated or persisted by this pipeline. */
  readonly candidate: {
    readonly values: T;
    readonly trust: "official" | "official_mirror" | "trusted_secondary";
    readonly source: {
      readonly requestedUrl: string;
      readonly finalUrl: string;
      readonly tier: SourceTier;
      readonly publisher: string;
      readonly title: string | null;
      readonly httpStatus: number | null;
      readonly contentType: string | null;
      readonly retrievedAt: string;
      readonly sha256: string;
    };
    readonly extraction: { readonly model: string; readonly attempts: number };
  } | null;
  readonly provenance: {
    readonly officialSourceFound: boolean;
    readonly officialSourceAccessible: boolean;
    readonly fallbackReason: FallbackReason | null;
    readonly discovery: {
      readonly status: "not_needed" | "succeeded" | "failed";
      readonly searchQueries: readonly string[];
      readonly sourcesFound: number;
      readonly call: ModelCall | null;
    };
  };
  readonly attempts: readonly SourceAttempt[];
  readonly researchedAt: string;
};

type Candidate = {
  readonly url: string;
  readonly origin: SourceAttempt["origin"];
  readonly discoveredVia: SourceAttempt["discoveredVia"];
  readonly searchTitle: string | null;
};

const TRUST_BY_TIER = {
  1: "official",
  2: "official_mirror",
  3: "trusted_secondary",
} as const;

/**
 * Known official sources first; when none yields a valid result, discovery
 * proposes URLs and the same steps run on them, best tier first. Every source
 * is fetched by the backend, and only fetched text reaches the model.
 */
export async function researchReferenceData<T>(
  year: number,
  spec: ResearchSpec<T>,
  deps: ResearchDeps,
): Promise<ResearchResult<T>> {
  const artifacts = await deps.artifacts.forDocument(year, "research");
  const run = new ResearchRun(year, spec, deps, artifacts);

  let found = await run.tryAll(
    spec.knownSources(year).map((url) => ({
      url,
      origin: "known",
      discoveredVia: "known_source",
      searchTitle: null,
    })),
  );

  let discovery: ResearchResult<T>["provenance"]["discovery"] = {
    status: "not_needed",
    searchQueries: [],
    sourcesFound: 0,
    call: null,
  };
  if (found === null) {
    const discovered = await deps.research.discover({
      subject: spec.discoverySubject,
      year,
    });
    await artifacts.write(
      "discovery.json",
      JSON.stringify(discovered, null, 2),
    );
    discovery = {
      status: discovered.call.outcome === "response" ? "succeeded" : "failed",
      searchQueries: discovered.searchQueries,
      sourcesFound: discovered.sources.length,
      call: discovered.call,
    };
    const fresh = discovered.sources
      .filter((source) => !run.hasTried(source.url))
      .map((source) => ({
        url: source.url,
        origin: "discovery" as const,
        discoveredVia: source.origin,
        searchTitle: source.title,
        tier: sourceTier(source.url),
      }));
    found = await run.tryAll(byTier(fresh));
  }

  const result: ResearchResult<T> = {
    year,
    status: found ? "validated" : "unresolved",
    candidate: found,
    provenance: {
      ...officialProvenance(run.attempts, found?.source.tier ?? null),
      discovery,
    },
    attempts: run.attempts,
    researchedAt: new Date().toISOString(),
  };
  await artifacts.write("result.json", JSON.stringify(result, null, 2));
  return result;
}

class ResearchRun<T> {
  readonly attempts: SourceAttempt[] = [];
  private readonly tried = new Set<string>();
  private extractions = 0;
  private readonly year: number;
  private readonly spec: ResearchSpec<T>;
  private readonly deps: ResearchDeps;
  private readonly artifacts: DebugArtifactWriter;

  constructor(
    year: number,
    spec: ResearchSpec<T>,
    deps: ResearchDeps,
    artifacts: DebugArtifactWriter,
  ) {
    this.year = year;
    this.spec = spec;
    this.deps = deps;
    this.artifacts = artifacts;
  }

  hasTried(url: string): boolean {
    return this.tried.has(url);
  }

  async tryAll(
    candidates: readonly Candidate[],
  ): Promise<ResearchResult<T>["candidate"]> {
    for (const candidate of candidates) {
      if (this.hasTried(candidate.url)) continue;
      const found = await this.tryOne(candidate);
      if (found) return found;
    }
    return null;
  }

  private async tryOne(
    candidate: Candidate,
  ): Promise<ResearchResult<T>["candidate"]> {
    this.tried.add(candidate.url);
    const n = this.attempts.length + 1;

    if (!isUsableTier(sourceTier(candidate.url))) {
      this.record(candidate, null, 4, "skipped_untrusted_tier", []);
      return null;
    }

    const document = await this.deps.fetcher.fetch(candidate.url);
    this.tried.add(document.finalUrl);
    await this.saveDocument(n, document);
    const tier = Math.max(
      sourceTier(candidate.url),
      sourceTier(document.finalUrl),
    ) as SourceTier;

    if (document.accessibility !== "accessible") {
      const problems = document.problem ? [document.problem] : [];
      this.record(candidate, document, tier, document.accessibility, problems);
      return null;
    }
    if (!isUsableTier(tier)) {
      this.record(candidate, document, tier, "skipped_untrusted_tier", [
        `redirected to ${document.finalUrl}`,
      ]);
      return null;
    }
    const text = extractionText(document, this.spec.pageKeywords);
    if (text === null) {
      this.record(candidate, document, tier, "no_relevant_content", [
        `no page mentions ${this.spec.pageKeywords.join(" or ")}`,
      ]);
      return null;
    }
    if (text.length > MAX_EXTRACTION_CHARACTERS) {
      this.record(candidate, document, tier, "document_too_large", [
        `${text.length} characters`,
      ]);
      return null;
    }
    if (this.extractions >= MAX_EXTRACTIONS) {
      this.record(candidate, document, tier, "skipped_extraction_limit", []);
      return null;
    }

    this.extractions++;
    // The model reads, and the validator checks against, the same text.
    const input: FetchedDocument = { ...document, text };
    if (text !== document.text) {
      await this.artifacts.write(`source-${n}.extraction-input.txt`, text);
    }
    const task = this.spec.task(this.year);
    const writeTrace = (trace: LlmTrace) =>
      this.artifacts.write(
        `source-${n}.llm-${task.name}.json`,
        JSON.stringify(trace, null, 2),
      );
    try {
      const extraction = await this.deps.extraction.extract(task, input);
      await writeTrace(extraction.trace);
      const values = this.spec.validate(extraction.raw, input, this.year);
      this.record(candidate, document, tier, "validated", []);
      return {
        values,
        trust: TRUST_BY_TIER[tier as 1 | 2 | 3],
        source: {
          requestedUrl: document.requestedUrl,
          finalUrl: document.finalUrl,
          tier,
          publisher: document.publisher,
          title: document.title,
          httpStatus: document.httpStatus,
          contentType: document.contentType,
          retrievedAt: document.retrievedAt,
          sha256: document.sha256!,
        },
        extraction: {
          model: extraction.trace.model,
          attempts: extraction.trace.attempts.length,
        },
      };
    } catch (error) {
      if (!(error instanceof RulesPipelineError)) throw error;
      if (isLlmTrace(error.details)) await writeTrace(error.details);
      this.record(
        candidate,
        document,
        tier,
        outcomeOf(error),
        problemsOf(error),
      );
      return null;
    }
  }

  private record(
    candidate: Candidate,
    document: FetchedDocument | null,
    tier: SourceTier,
    outcome: AttemptOutcome,
    problems: readonly string[],
  ): void {
    this.attempts.push({
      origin: candidate.origin,
      discoveredVia: candidate.discoveredVia,
      searchTitle: candidate.searchTitle,
      requestedUrl: candidate.url,
      finalUrl: document?.finalUrl ?? null,
      tier,
      publisher: document?.publisher ?? null,
      httpStatus: document?.httpStatus ?? null,
      retrievedAt: document?.retrievedAt ?? null,
      sha256: document?.sha256 ?? null,
      contentType: document?.contentType ?? null,
      title: document?.title ?? null,
      outcome,
      problems,
    });
  }

  /** The bytes and the text the model would read, kept for inspection. */
  private async saveDocument(n: number, document: FetchedDocument) {
    const { bytes, text, ...metadata } = document;
    await this.artifacts.write(
      `source-${n}.json`,
      JSON.stringify(metadata, null, 2),
    );
    if (bytes) {
      const extension =
        { "pdf-text": "pdf", "html-text": "html", "plain-text": "txt" }[
          document.format ?? "plain-text"
        ] ?? "bin";
      await this.artifacts.write(`source-${n}.raw.${extension}`, bytes);
    }
    if (text) await this.artifacts.write(`source-${n}.text.txt`, text);
  }
}

/** PDF text narrowed to the relevant pages; other formats as they are. */
function extractionText(
  document: FetchedDocument,
  keywords: readonly string[],
): string | null {
  if (document.format !== "pdf-text") return document.text;
  return pagesMentioning(document.text, keywords);
}

function outcomeOf(error: RulesPipelineError): AttemptOutcome {
  switch (error.code) {
    case "extraction_unclear":
      return "extraction_unclear";
    case "invalid_extraction":
      return "invalid_extraction";
    default:
      return "extraction_failed";
  }
}

function problemsOf(error: RulesPipelineError): string[] {
  const details = error.details as { problems?: unknown } | undefined;
  return Array.isArray(details?.problems)
    ? details.problems.map(String)
    : [error.message];
}

/**
 * An official source counts as found when any tier 1 URL was tried. The
 * fallback reason says why the result does not come from it.
 */
const REJECTED = new Set<AttemptOutcome>([
  "invalid_extraction",
  "extraction_unclear",
  "no_relevant_content",
  "unsupported_content",
  "document_too_large",
]);

function officialProvenance(
  attempts: readonly SourceAttempt[],
  resultTier: SourceTier | null,
): Pick<
  ResearchResult<unknown>["provenance"],
  "officialSourceFound" | "officialSourceAccessible" | "fallbackReason"
> {
  const official = attempts.filter(
    (attempt) => attempt.tier === 1 && attempt.outcome !== "not_found",
  );
  const officialSourceFound = official.length > 0;
  const officialSourceAccessible = official.some(
    (attempt) => attempt.outcome !== "blocked" && attempt.outcome !== "error",
  );
  let fallbackReason: FallbackReason | null = null;
  if (resultTier !== 1) {
    if (!officialSourceFound) fallbackReason = "official_source_not_found";
    else if (!officialSourceAccessible)
      fallbackReason = "official_source_blocked";
    else if (official.some((attempt) => REJECTED.has(attempt.outcome)))
      fallbackReason = "official_source_rejected";
    else if (
      official.some((attempt) => attempt.outcome === "extraction_failed")
    )
      fallbackReason = "official_extraction_failed";
    else fallbackReason = "official_source_rejected";
  }
  return { officialSourceFound, officialSourceAccessible, fallbackReason };
}
