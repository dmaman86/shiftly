import type {
  CandidateSource,
  RevisionFallbackReason,
  RevisionTrust,
} from "../reference-data/ports.ts";
import type {
  FallbackReason,
  ResearchResult,
  SourceAttempt,
} from "./research-pipeline.ts";

export type CandidateProvenance = {
  readonly sources: readonly CandidateSource[];
  /** Index of the source the values were read from. */
  readonly supportingSource: number;
  readonly trust: RevisionTrust;
  readonly fallbackReason: RevisionFallbackReason | null;
};

const UNREAD_ACCESS: Partial<
  Record<SourceAttempt["outcome"], CandidateSource["accessStatus"]>
> = {
  blocked: "blocked",
  not_found: "not_found",
  error: "unavailable",
  unsupported_content: "unsupported_content",
};

const FALLBACK_REASONS: Record<FallbackReason, RevisionFallbackReason> = {
  official_source_blocked: "official_source_blocked",
  official_source_not_found: "official_source_not_found",
  official_extraction_failed: "official_source_insufficient",
  official_source_rejected: "official_source_insufficient",
};

/**
 * Every source the run tried to fetch, with the validated one as 'supporting'
 * and the rest (blocked official pages included) as 'consulted'. Sources that
 * were never requested (tier 4) are left out.
 */
export function candidateProvenance(
  result: ResearchResult<unknown>,
): CandidateProvenance | null {
  if (result.candidate === null) return null;
  const queries = result.provenance.discovery.searchQueries;

  const sources: CandidateSource[] = [];
  // The store keeps one row per fetched content, and links must be unique.
  const indexByContent = new Map<string, number>();
  let supportingSource = -1;
  for (const attempt of result.attempts) {
    if (attempt.retrievedAt === null) continue;
    const unread = UNREAD_ACCESS[attempt.outcome];
    const fetched = unread === undefined && attempt.sha256 !== null;
    const contentKey = fetched ? `${attempt.finalUrl} ${attempt.sha256}` : null;
    const seen =
      contentKey === null ? undefined : indexByContent.get(contentKey);
    if (seen !== undefined) {
      if (attempt.outcome === "validated") {
        supportingSource = seen;
        sources[seen] = { ...sources[seen], role: "supporting" };
      }
      continue;
    }
    if (contentKey !== null) indexByContent.set(contentKey, sources.length);
    if (attempt.outcome === "validated") supportingSource = sources.length;
    sources.push({
      url: attempt.requestedUrl,
      finalUrl: attempt.finalUrl,
      publisher: attempt.publisher ?? "unknown",
      tier: attempt.tier,
      discoveredVia: attempt.discoveredVia,
      accessStatus: fetched ? "fetched" : (unread ?? "unavailable"),
      httpStatus: attempt.httpStatus,
      contentType: attempt.contentType,
      title: attempt.title,
      sha256: fetched ? attempt.sha256 : null,
      grounding:
        attempt.discoveredVia === "grounding_metadata"
          ? { searchTitle: attempt.searchTitle, searchQueries: queries }
          : null,
      fetchAttemptedAt: attempt.retrievedAt,
      role: attempt.outcome === "validated" ? "supporting" : "consulted",
    });
  }
  if (supportingSource === -1) return null;

  const tier = result.candidate.source.tier;
  if (tier <= 2) {
    return {
      sources,
      supportingSource,
      trust: "official_verified",
      fallbackReason: null,
    };
  }
  const reason = result.provenance.fallbackReason;
  return {
    sources,
    supportingSource,
    trust: "secondary_verified",
    fallbackReason: reason
      ? FALLBACK_REASONS[reason]
      : "official_source_insufficient",
  };
}
