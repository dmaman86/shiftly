import {
  BASELINE_REFERENCE_TIMELINES,
  createReferenceResolver,
  type ReferenceResolver,
  type ReferenceTimelines,
} from "@shiftly/domain";
import { toReferenceTimelines } from "@/adapters/referenceTimelines.adapter";
import { referenceService, type PublishedTimelines } from "./reference.service";
import { timelineCache } from "./timelineCache";

/**
 * Where the rates the calculation uses came from. Transport and contract
 * failures live here; a date the chosen timelines cannot resolve is a
 * ReferenceIssue instead.
 */
export type ReferenceSource =
  | { status: "fresh" }
  | { status: "stale"; fetchedAt: string; reason: string }
  | { status: "baseline"; reason: string };

export interface LoadedReferences {
  readonly timelines: ReferenceTimelines;
  readonly resolver: ReferenceResolver;
  readonly source: ReferenceSource;
  /** Changes only when the values do, so it can key memos and queries. */
  readonly version: string;
}

const referenceApi = referenceService();

/** A short, stable fingerprint of the values (FNV-1a over their JSON). */
const versionOf = (timelines: ReferenceTimelines): string => {
  let hash = 0x811c9dc5;
  for (const char of JSON.stringify(timelines)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
};

const loaded = (
  timelines: ReferenceTimelines,
  resolver: ReferenceResolver,
  source: ReferenceSource,
): LoadedReferences => ({
  timelines,
  resolver,
  source,
  version: versionOf(timelines),
});

/** Domain timelines and their resolver; null when they do not form valid timelines. */
const resolve = (
  published: PublishedTimelines,
): { timelines: ReferenceTimelines; resolver: ReferenceResolver } | null => {
  const timelines = toReferenceTimelines(published);
  try {
    return { timelines, resolver: createReferenceResolver(timelines) };
  } catch {
    return null;
  }
};

const BASELINE_RESOLVER = createReferenceResolver(BASELINE_REFERENCE_TIMELINES);

/**
 * What the calculation can use without the API: the last valid answer, or the
 * embedded baseline. Synchronous, so the first render never waits for the API.
 */
export const fallbackReferences = (reason: string): LoadedReferences => {
  const cached = timelineCache.read();
  const usable = cached && resolve(cached.timelines);
  return cached && usable
    ? loaded(usable.timelines, usable.resolver, {
        status: "stale",
        fetchedAt: cached.fetchedAt,
        reason,
      })
    : loaded(BASELINE_REFERENCE_TIMELINES, BASELINE_RESOLVER, {
        status: "baseline",
        reason,
      });
};

/**
 * Asks the API. A valid answer is authoritative and remembered as
 * last-known-good; an outage or a broken payload falls back to that answer,
 * then to the baseline. Client errors (4xx) still throw: they are bugs.
 */
export const loadReferenceTimelines = async (
  now: () => Date = () => new Date(),
): Promise<LoadedReferences> => {
  const result = await referenceApi.getTimelines();
  if (result.source === "unavailable") return fallbackReferences(result.reason);

  const usable = resolve(result.timelines);
  if (usable === null) return fallbackReferences("invalid_response");

  timelineCache.write({
    timelines: result.timelines,
    fetchedAt: now().toISOString(),
  });
  return loaded(usable.timelines, usable.resolver, { status: "fresh" });
};
