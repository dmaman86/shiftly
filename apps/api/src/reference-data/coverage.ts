import type {
  CurrentRevision,
  ReferenceKind,
  RevisionRepository,
} from "./ports.ts";

/**
 * - covered: an active or pending revision starts in the year, so research
 *   for it would only repeat work (or wait on review).
 * - missing: nothing starts in the year. An open-ended revision from an
 *   earlier year still counts as missing: annually indexed values go stale.
 * - unchecked: the store is off or could not be read; research runs anyway.
 */
export type KindCoverage =
  | {
      readonly kind: ReferenceKind;
      readonly status: "covered";
      readonly revisions: readonly CurrentRevision[];
    }
  | { readonly kind: ReferenceKind; readonly status: "missing" }
  | {
      readonly kind: ReferenceKind;
      readonly status: "unchecked";
      readonly reason: string;
    };

export async function yearCoverage(
  repository: RevisionRepository | null,
  kinds: readonly ReferenceKind[],
  year: number,
): Promise<KindCoverage[]> {
  if (repository === null) {
    return kinds.map((kind) => ({
      kind,
      status: "unchecked",
      reason: "persistence disabled",
    }));
  }
  const from = `${year}-01-01`;
  const until = `${year + 1}-01-01`;
  return Promise.all(
    kinds.map(async (kind): Promise<KindCoverage> => {
      try {
        const revisions = await repository.findStartingIn(kind, from, until);
        return revisions.length > 0
          ? { kind, status: "covered", revisions }
          : { kind, status: "missing" };
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        console.error(
          JSON.stringify({
            event: "reference_coverage_check_failed",
            kind,
            reason,
          }),
        );
        return { kind, status: "unchecked", reason };
      }
    }),
  );
}

/** Kinds that still need research for the year. */
export function uncoveredKinds(
  coverage: readonly KindCoverage[],
): Set<ReferenceKind> {
  return new Set(
    coverage
      .filter((entry) => entry.status !== "covered")
      .map((entry) => entry.kind),
  );
}
