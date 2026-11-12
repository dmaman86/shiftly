import { describe, expect, it, vi } from "vitest";
import {
  INCOME_TAX_RESEARCH_SPEC as SPEC,
  validateIncomeTaxFinding,
} from "../../../src/research/income-tax/income-tax-spec.ts";
import {
  selectResearchSpec,
  planningSpec,
} from "../../../src/research/spec-registry.ts";
import { parseResearchCommand } from "../../../src/cli/reference-research-command.ts";
import { planResearchTask } from "../../../src/research/planner.ts";
import { validateGroundedFindings } from "../../../src/research/grounded-findings.ts";
import { executeResearch } from "../../../src/research/execute-research.ts";
import type {
  ResearchFinding,
  ResearchTask,
  ResearchRevision,
  GroundedResearchProvider,
  ResearchAttempt,
} from "../../../src/research/contracts.ts";
import {
  answerFor,
  storeWith,
  REQUEST,
  TASK as FIXTURE_TASK,
  FINDING,
} from "../unified/fixtures.ts";

// Synthetic boundaries/rates, not researched Israeli tax parameters.
const BRACKETS = [
  { minIncome: 0, maxIncome: 1000, taxRate: 0.1 },
  { minIncome: 1001, maxIncome: 2000, taxRate: 0.2 },
  { minIncome: 2001, maxIncome: 3000, taxRate: 0.3 },
  { minIncome: 3001, maxIncome: 4000, taxRate: 0.4 },
  { minIncome: 4001, maxIncome: null, taxRate: 0.5 },
];
const NOW = new Date("2026-02-20T10:00:00Z");
const TASK: ResearchTask = {
  ...FIXTURE_TASK,
  specId: SPEC.id,
  specVersion: SPEC.version,
};
const finding = (patch: Partial<ResearchFinding> = {}): ResearchFinding => ({
  ...FINDING,
  population: SPEC.population,
  value: { monthlyValue: 200 },
  quote:
    "Synthetic monthly ILS parameter and effective date fixture, not a real tax publication.",
  ...patch,
});
const revision = (patch: Partial<ResearchRevision> = {}): ResearchRevision => ({
  ...finding(),
  id: "active",
  status: "active",
  trust: "official_verified",
  sufficientEvidence: true,
  ...patch,
});
const grouped: typeof REQUEST = {
  ...REQUEST,
  parameters: ["income_tax.monthly_brackets", "income_tax.credit_point"],
};

describe("monthly income tax specification", () => {
  it("registers the real specification without an execution opt-in or provider fallback", () => {
    expect(selectResearchSpec("income-tax")).toBe(SPEC);
    expect(planningSpec("income-tax")).toBe(SPEC);
    expect(SPEC.sourcePriority[0]).toBe("Israel Tax Authority");
    expect(SPEC.refreshPolicy).toEqual({
      intervalDays: 90,
      unresolvedDays: 30,
    });
  });
  it("requires year and month in the CLI and never batches months", () => {
    const args = [
      "--domain",
      "income-tax",
      "--parameters",
      "income_tax.credit_point",
      "--year",
      "2026",
      "--plan",
    ];
    expect(() => parseResearchCommand(args)).toThrow();
    expect(parseResearchCommand([...args, "--month", "2"]).request).toEqual(
      REQUEST,
    );
    expect(() => parseResearchCommand([...args, "--month", "2,3"])).toThrow();
    expect(() =>
      parseResearchCommand([...args, "--month", "2", "--months", "2,3"]),
    ).toThrow();
  });
  it.each([
    {},
    { monthlyValue: 0 },
    { monthlyValue: 2400 },
    { monthlyValue: 2.25 },
    { monthlyValue: 200, points: 2.25 },
    { value: 200 },
  ])(
    "rejects invalid credit point value %j independently of brackets",
    (value) => {
      expect(
        validateIncomeTaxFinding(finding({ value }), TASK).length,
      ).toBeGreaterThan(0);
    },
  );
  it("preserves the existing independent credit point and bracket value schemas", () => {
    expect(validateIncomeTaxFinding(finding(), TASK)).toEqual([]);
    expect(
      validateIncomeTaxFinding(
        finding({
          kind: "income_tax.monthly_brackets",
          value: { brackets: BRACKETS },
        }),
        { ...TASK, request: grouped },
      ),
    ).toEqual([]);
  });
  it("rejects annual-only or ambiguous units even when the numbers are plausible", () => {
    for (const quote of [
      "Synthetic annual tax credit value fixture.",
      "ערך שנתי סינתטי של נקודת זיכוי לבדיקה בלבד.",
      FINDING.quote,
    ]) {
      expect(
        validateIncomeTaxFinding(finding({ quote }), TASK).length,
      ).toBeGreaterThan(0);
    }
    expect(
      validateIncomeTaxFinding(
        finding({ quote: "מקור בדיקה סינתטי: שווי חודשי של נקודת זיכוי." }),
        TASK,
      ),
    ).toEqual([]);
  });
  it.each(
    [
      [],
      BRACKETS.slice(1),
      BRACKETS.map((b, i) => (i === 1 ? { ...b, minIncome: 1002 } : b)),
      BRACKETS.map((b, i) => (i === 1 ? { ...b, taxRate: 0.1 } : b)),
      BRACKETS.map((b, i) => (i === 1 ? { ...b, maxIncome: null } : b)),
      BRACKETS.map((b, i) => (i === 4 ? { ...b, maxIncome: 5000 } : b)),
      BRACKETS.map((b) => ({ ...b, taxRate: b.taxRate * 100 })),
      BRACKETS.map((b) => ({
        ...b,
        minIncome: b.minIncome * 100,
        maxIncome: b.maxIncome === null ? null : b.maxIncome * 100,
      })),
    ].map((brackets) => [brackets] as const),
  )("rejects an empty, inconsistent or implausible table %j", (brackets) => {
    expect(
      validateIncomeTaxFinding(
        finding({ kind: "income_tax.monthly_brackets", value: { brackets } }),
        { ...TASK, request: grouped },
      ).length,
    ).toBeGreaterThan(0);
  });
  it("accepts actual effective dates before the requested year without monthly clipping", () => {
    const result = validateGroundedFindings(
      TASK,
      SPEC,
      answerFor(TASK, [finding({ validFrom: "2025-07-15" })]),
    );
    expect(result.resolvedParameters).toEqual(REQUEST.parameters);
    expect(result.candidates[0].validFrom).toBe("2025-07-15");
    expect(result.candidates[0].validTo).toBeNull();
  });
  it("requires both actual intervals for a mid-month change and detects a gap", () => {
    const items = [
      finding({ validFrom: "2025-07-15", validTo: "2026-02-12" }),
      finding({ validFrom: "2026-02-12", value: { monthlyValue: 210 } }),
    ];
    const complete = validateGroundedFindings(
      TASK,
      SPEC,
      answerFor(TASK, items),
    );
    expect(complete.resolvedParameters).toEqual(REQUEST.parameters);
    expect(complete.candidates.map((c) => [c.validFrom, c.validTo])).toEqual([
      ["2025-07-15", "2026-02-12"],
      ["2026-02-12", null],
    ]);
    const gap = validateGroundedFindings(
      TASK,
      SPEC,
      answerFor(TASK, [{ ...items[0], validTo: "2026-02-11" }, items[1]]),
    );
    expect(gap.resolvedParameters).toEqual([]);
  });
  it("keeps overlapping findings unresolved and rejects impossible effective dates", () => {
    const overlap = validateGroundedFindings(
      TASK,
      SPEC,
      answerFor(TASK, [
        finding(),
        finding({ validFrom: "2026-02-12", value: { monthlyValue: 210 } }),
      ]),
    );
    expect(overlap.candidates).toEqual([]);
    expect(overlap.resolvedParameters).toEqual([]);
    expect(() =>
      validateGroundedFindings(
        TASK,
        SPEC,
        answerFor(TASK, [finding({ validFrom: "2026-02-30" })]),
      ),
    ).toThrow("invalid_output");
  });
  it("rejects fabricated or missing grounding without claiming official verification", () => {
    const answer = answerFor(TASK, [finding()]);
    for (const broken of [
      { ...answer, supports: [] },
      {
        ...answer,
        chunks: [
          {
            uri: "https://www.gov.il/unrelated-fixture",
            title: null,
            resolvedUri: null,
          },
        ],
      },
    ]) {
      const result = validateGroundedFindings(TASK, SPEC, broken);
      expect(result.candidates).toEqual([]);
      expect(result.resolvedParameters).toEqual([]);
    }
    expect(
      validateGroundedFindings(TASK, SPEC, answer).candidates[0].trust,
    ).toBe("official_grounded");
  });
  it("plans only missing parameters and skips verified historical monthly coverage", () => {
    const snapshot = {
      revisions: [revision({ validFrom: "2025-06-01" })],
      attempts: [],
    };
    expect(
      planResearchTask(
        { ...REQUEST, year: 2025, month: 8 },
        SPEC,
        snapshot,
        NOW,
      ),
    ).toBeNull();
    expect(
      planResearchTask(
        { ...grouped, year: 2025, month: 8 },
        SPEC,
        snapshot,
        NOW,
      )!.request,
    ).toMatchObject({
      year: 2025,
      month: 8,
      parameters: ["income_tax.monthly_brackets"],
    });
  });
  it("keeps quarterly freshness independent of month boundaries without covering missing data", () => {
    const attempt: ResearchAttempt = {
      id: "prior-month-check",
      task: { ...TASK, request: { ...REQUEST, month: 1 } },
      state: "completed",
      leaseUntil: "2026-01-25T10:00:00Z",
      nextEligibleAt: "2026-04-25T10:00:00Z",
      resolvedParameters: REQUEST.parameters,
      finishedAt: "2026-01-25T10:00:00Z",
    };
    const snapshot = { revisions: [revision()], attempts: [attempt] };
    expect(planResearchTask(REQUEST, SPEC, snapshot, NOW)).toBeNull();
    const due = planResearchTask(
      { ...REQUEST, month: 5 },
      SPEC,
      snapshot,
      new Date("2026-05-01T10:00:00Z"),
    );
    expect(due?.request).toMatchObject({ year: 2026, month: 5 });
    expect(
      planResearchTask(
        REQUEST,
        SPEC,
        { revisions: [], attempts: [attempt] },
        NOW,
      )?.request,
    ).toEqual(REQUEST);
    expect(
      planResearchTask(
        { ...REQUEST, year: 2027, month: 1 },
        SPEC,
        snapshot,
        NOW,
      ),
    ).not.toBeNull();
    for (const request of [
      { ...REQUEST, year: 2020, month: 1 },
      { ...REQUEST, year: 2027, month: 1 },
    ]) {
      const unrelated: ResearchAttempt = {
        ...attempt,
        task: { ...TASK, request },
        finishedAt: "2026-01-25T10:00:00Z",
      };
      expect(
        planResearchTask(
          REQUEST,
          SPEC,
          { revisions: [revision()], attempts: [unrelated] },
          NOW,
        ),
      ).not.toBeNull();
    }
  });
  it("suppresses repeated unsuccessful research without turning an attempt into reference coverage", () => {
    const attempt: ResearchAttempt = {
      id: "unresolved",
      task: TASK,
      state: "failed",
      leaseUntil: "2026-02-19T10:00:00Z",
      nextEligibleAt: "2026-03-21T10:00:00Z",
      resolvedParameters: [],
      finishedAt: "2026-02-19T10:00:00Z",
    };
    const snapshot = { revisions: [], attempts: [attempt] };
    expect(planResearchTask(REQUEST, SPEC, snapshot, NOW)).toBeNull();
    expect(
      planResearchTask(
        REQUEST,
        SPEC,
        snapshot,
        new Date("2026-03-22T10:00:00Z"),
      )?.request,
    ).toEqual(REQUEST);
    expect(
      planResearchTask({ ...REQUEST, month: 3 }, SPEC, snapshot, NOW)?.request,
    ).toMatchObject({ month: 3 });
  });
  it("makes one request for grouped parameters and creates independent pending candidates", async () => {
    const store = storeWith();
    const research = vi.fn<GroundedResearchProvider["research"]>(async (task) =>
      answerFor(task, [
        finding({
          kind: "income_tax.monthly_brackets",
          value: { brackets: BRACKETS },
        }),
        finding({ validTo: "2026-02-12" }),
        finding({ validFrom: "2026-02-12", value: { monthlyValue: 210 } }),
      ]),
    );
    const result = await executeResearch(
      grouped,
      SPEC,
      { store, provider: { research }, now: () => NOW },
      { persistCandidates: true },
    );
    expect(result.status).toBe("completed");
    expect(research).toHaveBeenCalledTimes(1);
    expect(research.mock.calls[0][0].request).toEqual(grouped);
    expect(store.insertCandidate).toHaveBeenCalledTimes(3);
    expect(result.candidates?.map((c) => c.kind)).toEqual([
      "income_tax.monthly_brackets",
      "income_tax.credit_point",
      "income_tax.credit_point",
    ]);
    expect("activate" in store).toBe(false);
  });
  it("does not duplicate unchanged revisions across explicitly separate monthly requests", async () => {
    const store = storeWith({ revisions: [revision()], attempts: [] });
    const research = vi.fn<GroundedResearchProvider["research"]>(async (task) =>
      answerFor(task, [finding()]),
    );
    for (const month of [2, 3]) {
      const result = await executeResearch(
        { ...REQUEST, month },
        SPEC,
        { store, provider: { research }, now: () => NOW },
        { force: true, persistCandidates: true },
      );
      expect(result.status).toBe("completed");
      expect(result.candidates).toEqual([]);
    }
    expect(store.insertCandidate).not.toHaveBeenCalled();
    expect(research).toHaveBeenCalledTimes(2);
  });
  it("retains a supported credit value when brackets are invalid without retrying", async () => {
    const store = storeWith();
    const research = vi.fn<GroundedResearchProvider["research"]>(async (task) =>
      answerFor(task, [
        finding({
          kind: "income_tax.monthly_brackets",
          value: { brackets: [] },
        }),
        finding(),
      ]),
    );
    const result = await executeResearch(
      grouped,
      SPEC,
      { store, provider: { research }, now: () => NOW },
      { persistCandidates: true },
    );
    expect(result.status).toBe("unresolved");
    expect(result.candidates?.map((c) => c.kind)).toEqual([
      "income_tax.credit_point",
    ]);
    expect(research).toHaveBeenCalledTimes(1);
    expect(store.finish.mock.calls[0][1].resolvedParameters).toEqual([
      "income_tax.credit_point",
    ]);
  });
  it("does not retry a provider failure or create a reference value", async () => {
    const store = storeWith();
    const research = vi.fn<GroundedResearchProvider["research"]>(async () => {
      throw new Error("Synthetic timeout");
    });
    const result = await executeResearch(
      REQUEST,
      SPEC,
      { store, provider: { research }, now: () => NOW },
      { persistCandidates: true },
    );
    expect(result.status).toBe("provider_error");
    expect(research).toHaveBeenCalledTimes(1);
    expect(store.insertCandidate).not.toHaveBeenCalled();
    expect(store.finish.mock.calls[0][1].resolvedParameters).toEqual([]);
  });
});
