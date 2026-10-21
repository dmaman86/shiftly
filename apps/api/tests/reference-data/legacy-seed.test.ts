import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  SYSTEM_START_DATE,
  TimelineMealAllowanceCalculator,
  TimelinePerDiemCalculator,
} from "@shiftly/domain";
import { candidateIdentityProblem } from "../../src/reference-data/candidate-identity.ts";
import {
  legacySeedCandidates,
  type KnessetElection,
} from "../../src/reference-data/legacy-seed.ts";
import type {
  NewCandidate,
  ReferenceKind,
} from "../../src/reference-data/ports.ts";

const ELECTIONS: KnessetElection[] = JSON.parse(
  readFileSync(
    new URL("../../../../scripts/data/knesset-elections.json", import.meta.url),
    "utf8",
  ),
).elections;

const candidates = legacySeedCandidates(ELECTIONS);
const ofKind = (kind: ReferenceKind) =>
  candidates.filter((candidate) => candidate.kind === kind);

/** The seeded value covering a day, the way the store resolves it. */
function seededOn(kind: ReferenceKind, date: string): unknown {
  const covering = ofKind(kind).filter(
    ({ validFrom, validTo }) =>
      validFrom <= date && (validTo === null || date < validTo),
  );
  expect(covering.length).toBeLessThanOrEqual(1);
  return covering[0]?.value;
}

/**
 * Every month the domain calculates, up to toYear. The calculators refuse
 * months before SYSTEM_START_DATE, so the seed is compared from there on.
 */
function* supportedMonthsUntil(toYear: number) {
  for (
    let year = Number(SYSTEM_START_DATE.slice(0, 4));
    year <= toYear;
    year++
  ) {
    for (let month = 1; month <= 12; month++) {
      const date = `${year}-${String(month).padStart(2, "0")}-01`;
      if (date >= SYSTEM_START_DATE) yield { year, month, date };
    }
  }
}

describe("legacySeedCandidates", () => {
  it("matches the per diem timeline every month", () => {
    const calculator = new TimelinePerDiemCalculator();
    for (const { year, month, date } of supportedMonthsUntil(2030)) {
      const rate = calculator.calculateRate({ year, month });
      expect(seededOn("per_diem.point_rate", date), date).toEqual({
        amount: rate,
      });
    }
  });

  it("matches the meal allowance timeline every month", () => {
    const calculator = new TimelineMealAllowanceCalculator();
    for (const { year, month, date } of supportedMonthsUntil(2030)) {
      const rates = calculator.calculateRates({ year, month });
      expect(seededOn("meal_allowance.rates", date), date).toEqual(rates);
    }
  });

  it("stores each election as a single day identified by its Knesset number", () => {
    expect(
      ofKind("calendar.knesset_election").map(
        ({ subjectKey, validFrom, validTo, value }) => ({
          subjectKey,
          validFrom,
          validTo,
          value,
        }),
      ),
    ).toContainEqual({
      subjectKey: "knesset:26",
      validFrom: "2026-10-27",
      validTo: "2026-10-28",
      value: { knessetNumber: 26, electionStatus: "planned" },
    });
    expect(ofKind("calendar.knesset_election")).toHaveLength(ELECTIONS.length);
  });

  it("lists every election status explicitly, matching the migration", () => {
    expect(
      Object.fromEntries(
        ofKind("calendar.knesset_election").map(({ subjectKey, value }) => [
          subjectKey,
          (value as { electionStatus: string }).electionStatus,
        ]),
      ),
    ).toEqual({
      "knesset:20": "occurred",
      "knesset:21": "occurred",
      "knesset:22": "occurred",
      "knesset:23": "occurred",
      "knesset:24": "occurred",
      "knesset:25": "occurred",
      "knesset:26": "planned",
    });
  });

  it("refuses an election without a listed status instead of guessing one", () => {
    expect(() =>
      legacySeedCandidates([
        ...ELECTIONS,
        { knessetNumber: 27, date: "2030-10-29" },
      ]),
    ).toThrow("No seed status listed for Knesset election 27");
  });

  it("gives every candidate the identity its kind requires", () => {
    for (const candidate of candidates) {
      expect(candidateIdentityProblem(candidate)).toBeNull();
    }
    expect(
      ofKind("per_diem.point_rate").every(
        ({ subjectKey }) => subjectKey === null,
      ),
    ).toBe(true);
  });

  it("marks every value as an unsourced legacy seed", () => {
    for (const candidate of candidates) {
      expect(candidate).toMatchObject<Partial<NewCandidate>>({
        origin: "seed",
        trust: "legacy_seed",
        fallbackReason: null,
        sources: [],
      });
      for (const evidence of candidate.evidence) {
        expect(evidence).toMatchObject({
          evidenceType: "manual",
          source: null,
        });
        expect(evidence.note).toBeTruthy();
      }
    }
  });

  it("flags the provisional historical dates for review", () => {
    const provisional = candidates
      .filter((candidate) => candidate.evidence.length > 0)
      .map(({ kind, validFrom }) => `${kind} ${validFrom}`);
    expect(provisional).toEqual([
      "per_diem.point_rate 2015-11-01",
      "per_diem.point_rate 2021-01-01",
      "meal_allowance.rates 2000-01-01",
    ]);
  });
});
