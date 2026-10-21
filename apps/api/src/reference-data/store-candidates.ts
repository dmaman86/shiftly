import { candidateIdentityProblem } from "./candidate-identity.ts";
import type {
  NewCandidate,
  ReferenceKind,
  RevisionRepository,
} from "./ports.ts";

export type StoredRevision = {
  readonly kind: ReferenceKind;
  readonly id: string;
};

export type PersistenceOutcome =
  | { readonly status: "disabled" }
  | { readonly status: "nothing_to_store" }
  | { readonly status: "stored"; readonly revisions: readonly StoredRevision[] }
  | {
      readonly status: "failed";
      /** Candidates stored before the failure; they stay pending review. */
      readonly revisions: readonly StoredRevision[];
      readonly error: string;
    };

/**
 * Stores each candidate as a pending revision. A candidate whose subjectKey
 * does not fit its kind, or a storage failure, is reported,
 * never thrown: the research result is still returned, and storing again is
 * safe because the store returns the existing revision for the same value.
 */
export async function storeCandidates(
  repository: RevisionRepository | null,
  candidates: readonly NewCandidate[],
): Promise<PersistenceOutcome> {
  if (repository === null) return { status: "disabled" };
  if (candidates.length === 0) return { status: "nothing_to_store" };

  // Checked for all before storing any, so a malformed batch stores nothing.
  for (const candidate of candidates) {
    const problem = candidateIdentityProblem(candidate);
    if (problem !== null) {
      console.error(
        JSON.stringify({
          event: "reference_candidate_rejected",
          kind: candidate.kind,
          message: problem,
        }),
      );
      return { status: "failed", revisions: [], error: problem };
    }
  }

  const revisions: StoredRevision[] = [];
  for (const candidate of candidates) {
    try {
      const id = await repository.insertCandidate(candidate);
      revisions.push({ kind: candidate.kind, id });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        JSON.stringify({
          event: "reference_candidate_store_failed",
          kind: candidate.kind,
          message,
        }),
      );
      return { status: "failed", revisions, error: message };
    }
  }
  return { status: "stored", revisions };
}
