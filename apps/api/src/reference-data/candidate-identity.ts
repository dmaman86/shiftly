import type { NewCandidate, ReferenceKind } from "./ports.ts";

/**
 * Which kinds identify their revisions by subject, and the subject format.
 * The database only knows subject_key is a stable identity; what a subject
 * means for each kind is decided here.
 *
 * A kind is either subject-keyed or not, never both: activation replaces by
 * subject for the first and by period for the second, and mixing them in one
 * kind would let a revision escape the replacement it needs.
 */
const SUBJECT_FORMATS: Partial<Record<ReferenceKind, RegExp>> = {
  "calendar.knesset_election": /^knesset:[1-9]\d*$/,
};

/** Why the candidate's subjectKey does not fit its kind; null when it does. */
export function candidateIdentityProblem(
  candidate: Pick<NewCandidate, "kind" | "subjectKey">,
): string | null {
  const format = SUBJECT_FORMATS[candidate.kind];
  if (format === undefined) {
    return candidate.subjectKey === null
      ? null
      : `${candidate.kind} has no subjects, got subjectKey ${candidate.subjectKey}`;
  }
  if (candidate.subjectKey === null) {
    return `${candidate.kind} requires a subjectKey`;
  }
  return format.test(candidate.subjectKey)
    ? null
    : `${candidate.kind} subjectKey ${candidate.subjectKey} does not match ${format}`;
}
