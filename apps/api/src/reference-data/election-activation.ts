import type { RevisionDetails } from "./ports.ts";

export type ActivatableElection = RevisionDetails & {
  readonly subjectKey: string;
};

/**
 * Whether the election command may activate this revision. It only promotes
 * Knesset elections that are still pending review, so it can never touch
 * income tax or bring back a superseded value.
 */
export function checkElectionActivation(
  id: string,
  revision: RevisionDetails | null,
):
  | { readonly ok: true; readonly revision: ActivatableElection }
  | { readonly ok: false; readonly problem: string } {
  if (revision === null) {
    return { ok: false, problem: `revision ${id} not found` };
  }
  if (revision.kind !== "calendar.knesset_election") {
    return {
      ok: false,
      problem: `revision ${id} is ${revision.kind}, not a Knesset election`,
    };
  }
  if (revision.status !== "pending_review") {
    return {
      ok: false,
      problem: `revision ${id} is ${revision.status}, not pending_review`,
    };
  }
  const { subjectKey } = revision;
  if (subjectKey === null) {
    return { ok: false, problem: `revision ${id} has no subject` };
  }
  return { ok: true, revision: { ...revision, subjectKey } };
}
