import type { RevisionDetails } from "./ports.ts";

/**
 * Whether the reference command may activate this revision. It only promotes
 * timeline values (no subject) that are still pending review; subject-keyed
 * references such as elections have their own command, and a superseded or
 * rejected revision is never brought back.
 */
export function checkTimelineActivation(
  id: string,
  revision: RevisionDetails | null,
):
  | { readonly ok: true; readonly revision: RevisionDetails }
  | { readonly ok: false; readonly problem: string } {
  if (revision === null) {
    return { ok: false, problem: `revision ${id} not found` };
  }
  if (revision.status !== "pending_review") {
    return {
      ok: false,
      problem: `revision ${id} is ${revision.status}, not pending_review`,
    };
  }
  if (revision.subjectKey !== null) {
    return {
      ok: false,
      problem: `revision ${id} belongs to subject ${revision.subjectKey}; activate it with its own command`,
    };
  }
  return { ok: true, revision };
}
