import type { NewCandidate, ReferenceKind } from "./ports.ts";

/**
 * Values the app already ships with, stored as 'legacy_seed' revisions so the
 * store starts from what the calculators use today. They carry no sources:
 * a reviewer decides whether to activate them, and research can supersede them.
 *
 * Must match the domain timelines month by month; the parity test in
 * tests/reference-data/legacy-seed.test.ts enforces it.
 */

type TimelineEntry<T> = {
  readonly year: number;
  readonly month: number;
  readonly value: T;
  readonly note: string | null;
};

const PROVISIONAL_DATE =
  "Provisional effective date carried over from the app timeline; verify against the authoritative source.";

/** TimelinePerDiemCalculator: the amount of one per diem point (tier A). */
export const PER_DIEM_POINT_RATES: readonly TimelineEntry<{
  readonly amount: number;
}>[] = [
  { year: 2015, month: 11, value: { amount: 29.5 }, note: PROVISIONAL_DATE },
  { year: 2021, month: 1, value: { amount: 31.6 }, note: PROVISIONAL_DATE },
  { year: 2022, month: 10, value: { amount: 33.9 }, note: null },
  { year: 2024, month: 9, value: { amount: 36.3 }, note: null },
];

/** TimelineMealAllowanceCalculator: small and large meal allowance amounts. */
export const MEAL_ALLOWANCE_RATES: readonly TimelineEntry<{
  readonly small: number;
  readonly large: number;
}>[] = [
  {
    year: 2000,
    month: 1,
    value: { small: 11.8, large: 17.1 },
    note: PROVISIONAL_DATE,
  },
  { year: 2021, month: 7, value: { small: 12.6, large: 18.3 }, note: null },
  { year: 2022, month: 10, value: { small: 13.5, large: 19.7 }, note: null },
  { year: 2024, month: 9, value: { small: 14.5, large: 21.1 }, note: null },
];

export type KnessetElection = {
  readonly knessetNumber: number;
  /** YYYY-MM-DD */
  readonly date: string;
};

export type ElectionStatus = "planned" | "confirmed" | "occurred" | "cancelled";

/**
 * The business status each seeded election starts with, listed explicitly:
 * never inferred from the date. It matches the data step of
 * supabase/migrations/20261021000001_reference_subject_identity.sql, so
 * re-running the seed reuses the migrated revisions. Promoting 26 to
 * confirmed is left to research with official evidence.
 */
export const LEGACY_ELECTION_STATUS: Readonly<Record<number, ElectionStatus>> =
  {
    20: "occurred",
    21: "occurred",
    22: "occurred",
    23: "occurred",
    24: "occurred",
    25: "occurred",
    26: "planned",
  };

const DAY_MS = 24 * 60 * 60 * 1000;

const monthStart = (year: number, month: number) =>
  `${year}-${String(month).padStart(2, "0")}-01`;

function nextDay(date: string): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + DAY_MS)
    .toISOString()
    .slice(0, 10);
}

function seedCandidate(
  kind: ReferenceKind,
  subjectKey: string | null,
  validFrom: string,
  validTo: string | null,
  value: unknown,
  note: string | null,
): NewCandidate {
  return {
    kind,
    subjectKey,
    validFrom,
    validTo,
    value,
    origin: "seed",
    trust: "legacy_seed",
    fallbackReason: null,
    sources: [],
    evidence:
      note === null
        ? []
        : [
            {
              evidenceType: "manual",
              source: null,
              carriedFromRevisionId: null,
              quote: null,
              section: null,
              sourceReference: null,
              page: null,
              effectiveFrom: validFrom,
              grounding: null,
              note,
            },
          ],
  };
}

/** Each entry applies until the next one starts; the last is open-ended. */
function timelineCandidates<T>(
  kind: ReferenceKind,
  timeline: readonly TimelineEntry<T>[],
): NewCandidate[] {
  return timeline.map((entry, index) => {
    const next = timeline[index + 1];
    return seedCandidate(
      kind,
      null,
      monthStart(entry.year, entry.month),
      next ? monthStart(next.year, next.month) : null,
      entry.value,
      entry.note,
    );
  });
}

/**
 * One single-day revision per election, identified by its Knesset number:
 * the date is the period, not the identity, so a rescheduled election
 * replaces its previous revision.
 */
function electionCandidates(
  elections: readonly KnessetElection[],
): NewCandidate[] {
  return elections.map(({ knessetNumber, date }) => {
    const electionStatus = LEGACY_ELECTION_STATUS[knessetNumber];
    if (electionStatus === undefined) {
      throw new Error(
        `No seed status listed for Knesset election ${knessetNumber}`,
      );
    }
    return seedCandidate(
      "calendar.knesset_election",
      `knesset:${knessetNumber}`,
      date,
      nextDay(date),
      { knessetNumber, electionStatus },
      null,
    );
  });
}

export function legacySeedCandidates(
  elections: readonly KnessetElection[],
): NewCandidate[] {
  return [
    ...timelineCandidates("per_diem.point_rate", PER_DIEM_POINT_RATES),
    ...timelineCandidates("meal_allowance.rates", MEAL_ALLOWANCE_RATES),
    ...electionCandidates(elections),
  ];
}
