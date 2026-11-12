import { describe, expect, it } from "vitest";
import {
  researchRequestSchema,
  type ResearchRevision,
  type ResearchAttempt,
} from "../../../src/research/contracts.ts";
import {
  monthInterval,
  planResearchTask,
  taskKey,
  uncoveredIntervals,
} from "../../../src/research/planner.ts";
import { selectResearchSpec } from "../../../src/research/spec-registry.ts";
import { parseResearchCommand } from "../../../src/cli/reference-research-command.ts";
import { REQUEST, SPEC, TASK, FINDING } from "./fixtures.ts";

const NOW = new Date("2026-02-20T10:00:00.000Z");
const revision = (patch: Partial<ResearchRevision> = {}): ResearchRevision => ({
  id: "revision",
  kind: FINDING.kind,
  subjectKey: null,
  status: "active",
  validFrom: "2025-01-01",
  validTo: null,
  value: FINDING.value,
  trust: "official_verified",
  sufficientEvidence: true,
  ...patch,
});

describe("research tasks and monthly coverage", () => {
  it("uses Israel's calendar date and compares lease timestamps as instants", () => {
    const late = planResearchTask(
      { ...REQUEST, month: 3 },
      SPEC,
      { revisions: [], attempts: [] },
      new Date("2026-02-28T23:30:00.000Z"),
    )!;
    expect(late.asOfDate).toBe("2026-03-01");
    const attempt: ResearchAttempt = {
      id: "expired",
      task: TASK,
      state: "claimed",
      leaseUntil: "2026-02-20T11:00:00+03:00",
      nextEligibleAt: "2026-02-01T00:00:00Z",
      resolvedParameters: [],
      finishedAt: null,
    };
    expect(
      planResearchTask(
        REQUEST,
        SPEC,
        { revisions: [], attempts: [attempt] },
        NOW,
      ),
    ).not.toBeNull();
  });
  it("requires one explicit year/month and existing domain parameters", () => {
    expect(researchRequestSchema.parse(REQUEST)).toEqual(REQUEST);
    for (const patch of [
      { month: undefined },
      { month: 0 },
      { month: 13 },
      { months: [1, 2] },
      { parameters: [] },
      { parameters: ["income_tax.credit_point", "income_tax.credit_point"] },
      { parameters: ["health_insurance.employee_standard_rate"] },
      { year: 2015, month: 10 },
    ]) {
      expect(
        researchRequestSchema.safeParse({ ...REQUEST, ...patch }).success,
      ).toBe(false);
    }
  });
  it("keeps subject-based elections independent of monthly requests", () => {
    expect(
      researchRequestSchema.safeParse({
        requestUnit: "subject",
        domain: "elections",
        subjectKey: "knesset:26",
        parameters: ["calendar.knesset_election"],
      }).success,
    ).toBe(true);
  });
  it("computes exact month boundaries including leap years and December", () => {
    expect(monthInterval(2024, 2)).toEqual({
      from: "2024-02-01",
      until: "2024-03-01",
    });
    expect(monthInterval(2026, 12).until).toBe("2027-01-01");
  });
  it("merges interval coverage and detects a mid-month gap", () => {
    expect(
      uncoveredIntervals(monthInterval(2026, 2), [
        { from: "2025-01-01", until: "2026-02-10" },
        { from: "2026-02-15", until: "2027-01-01" },
      ]),
    ).toEqual([{ from: "2026-02-10", until: "2026-02-15" }]);
  });
  it("does not research sufficiently covered historical periods", () => {
    const task = planResearchTask(
      { ...REQUEST, month: 1 },
      SPEC,
      { revisions: [revision()], attempts: [] },
      NOW,
    );
    expect(task).toBeNull();
  });
  it("does not treat a legacy seed as verified historical coverage", () => {
    expect(
      planResearchTask(
        { ...REQUEST, month: 1 },
        SPEC,
        {
          revisions: [
            revision({ trust: "legacy_seed", sufficientEvidence: false }),
          ],
          attempts: [],
        },
        NOW,
      ),
    ).not.toBeNull();
  });
  it("groups parameters only within the requested month", () => {
    const parameters = [
      "income_tax.credit_point",
      "income_tax.monthly_brackets",
    ] as const;
    const feb = planResearchTask(
      { ...REQUEST, parameters: [...parameters] },
      SPEC,
      { revisions: [], attempts: [] },
      NOW,
    )!;
    const mar = planResearchTask(
      { ...REQUEST, month: 3, parameters: [...parameters] },
      SPEC,
      { revisions: [], attempts: [] },
      NOW,
    )!;
    expect(feb.request.parameters).toEqual(parameters);
    expect(feb.id).not.toBe(mar.id);
    expect(
      taskKey({
        ...feb,
        request: { ...feb.request, parameters: [...parameters].reverse() },
      }),
    ).toBe(feb.id);
  });
  it("pending review suppresses duplicates but partial pending does not hide a gap", () => {
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
          revisions: [
            revision({ status: "pending_review", validTo: "2026-02-15" }),
          ],
          attempts: [],
        },
        NOW,
      ),
    ).not.toBeNull();
  });
  it("unknown dispatched attempts never retry automatically after lease expiry", () => {
    const attempt: ResearchAttempt = {
      id: "attempt",
      task: TASK,
      state: "dispatched",
      leaseUntil: "2026-02-01T00:00:00.000Z",
      nextEligibleAt: "2026-02-01T00:00:00.000Z",
      resolvedParameters: [],
      finishedAt: null,
    };
    expect(
      planResearchTask(
        REQUEST,
        SPEC,
        { revisions: [], attempts: [attempt] },
        NOW,
      ),
    ).toBeNull();
    expect(
      planResearchTask(
        REQUEST,
        SPEC,
        { revisions: [], attempts: [attempt] },
        NOW,
        { force: true },
      ),
    ).not.toBeNull();
  });
  it("cadence does not change the request granularity", () => {
    const attempt: ResearchAttempt = {
      id: "attempt",
      task: TASK,
      state: "completed",
      leaseUntil: NOW.toISOString(),
      nextEligibleAt: "2026-02-01T00:00:00.000Z",
      resolvedParameters: [FINDING.kind],
      finishedAt: "2026-02-01T00:00:00.000Z",
    };
    const snapshot = { revisions: [revision()], attempts: [attempt] };
    expect(planResearchTask(REQUEST, SPEC, snapshot, NOW)).toBeNull();
    const due = planResearchTask(
      REQUEST,
      { ...SPEC, refreshPolicy: { intervalDays: 7, unresolvedDays: 30 } },
      snapshot,
      NOW,
    )!;
    expect(due.request).toEqual(REQUEST);
  });
  it("rejects absent/ambiguous executable specs rather than using a fallback", () => {
    expect(() => selectResearchSpec("income-tax")).toThrow(
      "research_unavailable",
    );
    expect(selectResearchSpec("income-tax", [SPEC])).toBe(SPEC);
    expect(() => selectResearchSpec("income-tax", [SPEC, SPEC])).toThrow(
      "research_unavailable",
    );
  });
});

describe("reference research command", () => {
  const args = [
    "--domain",
    "income-tax",
    "--year",
    "2026",
    "--month",
    "2",
    "--parameters",
    "income_tax.credit_point",
  ];
  it("requires an explicit plan or execute and an exact month", () => {
    expect(parseResearchCommand([...args, "--plan"])).toEqual({
      request: REQUEST,
      mode: "plan",
      force: false,
    });
    expect(() => parseResearchCommand(args)).toThrow();
    expect(() =>
      parseResearchCommand([...args, "--plan", "--execute"]),
    ).toThrow();
    expect(() =>
      parseResearchCommand([...args, "--plan", "--months", "2,3"]),
    ).toThrow();
    expect(() =>
      parseResearchCommand([
        "--domain",
        "income-tax",
        "--year",
        "2026",
        "--parameters",
        "income_tax.credit_point",
        "--plan",
      ]),
    ).toThrow();
  });
  it("rejects persistent research switches and accepts election subjects without year/month", () => {
    expect(() =>
      parseResearchCommand([...args, "--execute", "--store"]),
    ).toThrow();
    expect(
      parseResearchCommand([
        "--domain",
        "elections",
        "--subject",
        "knesset:26",
        "--parameters",
        "calendar.knesset_election",
        "--plan",
      ]).request.requestUnit,
    ).toBe("subject");
  });
});
