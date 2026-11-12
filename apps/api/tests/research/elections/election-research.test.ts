import { describe, expect, it, vi } from "vitest";
import {
  ELECTION_RESEARCH_SPEC as SPEC,
  electionRequests,
  validateElectionFinding,
} from "../../../src/research/elections/election-spec.ts";
import { planResearchTask } from "../../../src/research/planner.ts";
import { executeResearch } from "../../../src/research/execute-research.ts";
import {
  selectResearchSpec,
  planningSpec,
} from "../../../src/research/spec-registry.ts";
import type {
  ResearchFinding,
  ResearchTask,
  ResearchRevision,
  GroundedResearchProvider,
  ResearchAttempt,
} from "../../../src/research/contracts.ts";
import { answerFor, storeWith, FINDING } from "../unified/fixtures.ts";

const NOW = new Date("2026-02-20T10:00:00Z");
const REQUEST = electionRequests(26, 26)[0];
const TASK: ResearchTask = {
  id: "synthetic-election",
  specId: SPEC.id,
  specVersion: SPEC.version,
  request: REQUEST,
  asOfDate: "2026-02-20",
  currentValues: [],
};
const finding = (patch: Partial<ResearchFinding> = {}): ResearchFinding => ({
  ...FINDING,
  kind: "calendar.knesset_election",
  subjectKey: "knesset:26",
  population: SPEC.population,
  validFrom: "2026-07-01",
  validTo: "2026-07-02",
  value: { knessetNumber: 26, electionStatus: "confirmed" },
  quote:
    "Synthetic fixture: the official election date is confirmed for this day.",
  ...patch,
});
const revision = (patch: Partial<ResearchRevision> = {}): ResearchRevision => ({
  id: "active",
  ...finding(),
  status: "active",
  trust: "official_verified",
  sufficientEvidence: true,
  ...patch,
});

describe("Knesset research specification", () => {
  it("does not treat a hypothetical cancellation as an official cancellation", () => {
    expect(
      validateElectionFinding(
        finding({
          value: { knessetNumber: 26, electionStatus: "cancelled" },
          quote:
            "Synthetic fixture: the election will be cancelled if the proposal passes.",
        }),
        TASK,
      ).length,
    ).toBeGreaterThan(0);
  });
  it("registers elections without enabling tax domains or replacing their planning contracts", () => {
    expect(selectResearchSpec("elections")).toBe(SPEC);
    expect(planningSpec("elections")).toBe(SPEC);
    expect(() => selectResearchSpec("income-tax")).toThrow(
      "research_unavailable",
    );
    expect(SPEC.sourcePriority[0]).toBe("Central Elections Committee");
  });
  it("creates a bounded subject universe without dates or monthly grouping", () => {
    expect(
      electionRequests(25, 26).map(
        (r) => r.requestUnit === "subject" && r.subjectKey,
      ),
    ).toEqual(["knesset:25", "knesset:26"]);
    for (const [first, last] of [
      [0, 26],
      [26, 25],
      [1, 101],
      [1.1, 2],
    ])
      expect(() => electionRequests(first, last)).toThrow();
  });
  it.each(["planned", "confirmed", "cancelled", "occurred"] as const)(
    "preserves the existing %s value and one-day interval",
    (status) => {
      const item = finding({
        validFrom: "2026-01-10",
        validTo: "2026-01-11",
        value: { knessetNumber: 26, electionStatus: status },
        quote:
          status === "occurred"
            ? "Synthetic fixture: the elections were held on the stated date."
            : status === "cancelled"
              ? "Synthetic fixture: the election was cancelled by official announcement."
              : FINDING.quote,
      });
      expect(validateElectionFinding(item, TASK)).toEqual([]);
    },
  );
  it("rejects invalid dates, subjects, schemas and rescheduled as a status", () => {
    for (const patch of [
      { subjectKey: "knesset:25" },
      { validTo: null },
      { validFrom: "2026-02-30" },
      { validTo: "2026-07-03" },
      { value: { knessetNumber: 25, electionStatus: "confirmed" } },
      { value: { knessetNumber: 26, electionStatus: "rescheduled" } },
      {
        value: {
          knessetNumber: 26,
          electionStatus: "confirmed",
          date: "2026-07-01",
        },
      },
    ]) {
      expect(
        validateElectionFinding(finding(patch), TASK).length,
      ).toBeGreaterThan(0);
    }
  });
  it("never infers occurred from a past date or a scheduled/negative/hypothetical quote", () => {
    for (const quote of [
      FINDING.quote,
      "The elections were scheduled for the stated date.",
      "The elections were not held.",
      "The elections will be held.",
      "הבחירות לא התקיימו בתאריך שנקבע מראש.",
    ]) {
      expect(
        validateElectionFinding(
          finding({
            validFrom: "2026-01-10",
            validTo: "2026-01-11",
            value: { knessetNumber: 26, electionStatus: "occurred" },
            quote,
          }),
          TASK,
        ).length,
      ).toBeGreaterThan(0);
    }
    expect(
      validateElectionFinding(
        finding({
          validFrom: TASK.asOfDate,
          validTo: "2026-02-21",
          value: { knessetNumber: 26, electionStatus: "occurred" },
          quote: "The elections were held on the stated day.",
        }),
        TASK,
      ).length,
    ).toBeGreaterThan(0);
  });
  it("admits explicit Hebrew occurrence text as grounded, not locally verified evidence", async () => {
    const store = storeWith();
    const research = vi.fn<GroundedResearchProvider["research"]>(async (task) =>
      answerFor(task, [
        finding({
          validFrom: "2026-01-10",
          validTo: "2026-01-11",
          value: { knessetNumber: 26, electionStatus: "occurred" },
          quote: "מקור סינתטי לבדיקות בלבד: הבחירות התקיימו בתאריך המצוין.",
        }),
      ]),
    );
    const result = await executeResearch(
      REQUEST,
      SPEC,
      { store, provider: { research }, now: () => NOW },
      { persistCandidates: true },
    );
    expect(result.status).toBe("completed");
    expect(result.candidates?.[0].trust).toBe("official_grounded");
    expect(research).toHaveBeenCalledTimes(1);
    expect("activate" in store).toBe(false);
  });
  it("skips final verified records but researches seeds, malformed finals and non-final records", () => {
    const final = revision({
      validFrom: "2026-01-10",
      validTo: "2026-01-11",
      value: { knessetNumber: 26, electionStatus: "occurred" },
    });
    expect(
      planResearchTask(
        REQUEST,
        SPEC,
        { revisions: [final], attempts: [] },
        NOW,
      ),
    ).toBeNull();
    for (const row of [
      { ...final, trust: "legacy_seed" as const },
      { ...final, sufficientEvidence: false },
      { ...final, validTo: null },
      revision(),
      revision({ value: { knessetNumber: 26, electionStatus: "planned" } }),
    ]) {
      expect(
        planResearchTask(
          REQUEST,
          SPEC,
          { revisions: [row], attempts: [] },
          NOW,
        ),
      ).not.toBeNull();
    }
  });
  it("checks planned/confirmed weekly and does not repeat pending or unsuccessful work", () => {
    const attempt: ResearchAttempt = {
      id: "attempt",
      task: TASK,
      state: "completed",
      leaseUntil: NOW.toISOString(),
      nextEligibleAt: "2026-02-01T00:00:00Z",
      finishedAt: "2026-02-18T00:00:00Z",
      resolvedParameters: ["calendar.knesset_election"],
    };
    expect(
      planResearchTask(
        REQUEST,
        SPEC,
        { revisions: [revision()], attempts: [attempt] },
        NOW,
      ),
    ).toBeNull();
    expect(
      planResearchTask(
        REQUEST,
        SPEC,
        {
          revisions: [revision()],
          attempts: [{ ...attempt, finishedAt: "2026-02-01T00:00:00Z" }],
        },
        NOW,
      ),
    ).not.toBeNull();
    expect(
      planResearchTask(
        REQUEST,
        SPEC,
        { revisions: [revision({ status: "pending_review" })], attempts: [] },
        NOW,
      ),
    ).toBeNull();
    expect(
      planResearchTask(
        REQUEST,
        SPEC,
        {
          revisions: [],
          attempts: [
            {
              ...attempt,
              state: "failed",
              nextEligibleAt: "2026-02-27T00:00:00Z",
              resolvedParameters: [],
            },
          ],
        },
        NOW,
      ),
    ).toBeNull();
  });
  it("a changed date creates only a pending candidate of the same subject; unchanged creates none", async () => {
    for (const changed of [false, true]) {
      const store = storeWith({ revisions: [revision()], attempts: [] });
      const research = vi.fn<GroundedResearchProvider["research"]>(
        async (task) =>
          answerFor(task, [
            finding(
              changed ? { validFrom: "2026-08-01", validTo: "2026-08-02" } : {},
            ),
          ]),
      );
      const result = await executeResearch(
        REQUEST,
        SPEC,
        { store, provider: { research }, now: () => NOW },
        { persistCandidates: true },
      );
      expect(store.insertCandidate).toHaveBeenCalledTimes(changed ? 1 : 0);
      if (changed)
        expect(result.candidates?.[0]).toMatchObject({
          subjectKey: "knesset:26",
          value: { electionStatus: "confirmed" },
          validFrom: "2026-08-01",
        });
      expect(research).toHaveBeenCalledTimes(1);
    }
  });
  it("missing occurrence evidence remains unresolved and never stores a value", async () => {
    const store = storeWith();
    const research = vi.fn<GroundedResearchProvider["research"]>(async (task) =>
      answerFor(task, [
        finding({
          validFrom: "2026-01-10",
          validTo: "2026-01-11",
          value: { knessetNumber: 26, electionStatus: "occurred" },
        }),
      ]),
    );
    expect(
      (
        await executeResearch(
          REQUEST,
          SPEC,
          { store, provider: { research }, now: () => NOW },
          { persistCandidates: true },
        )
      ).status,
    ).toBe("unresolved");
    expect(store.insertCandidate).not.toHaveBeenCalled();
  });
});
