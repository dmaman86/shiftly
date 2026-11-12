import { describe, expect, it, vi } from "vitest";
import {
  ALLOWANCES_RESEARCH_SPEC as SPEC,
  validateAllowanceFinding,
} from "../../../src/research/allowances/allowances-spec.ts";
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
  ResearchRequest,
  ResearchRevision,
  ResearchAttempt,
  GroundedResearchProvider,
} from "../../../src/research/contracts.ts";
import { answerFor, storeWith, FINDING } from "../unified/fixtures.ts";

// Synthetic values only, not researched Israeli allowance rates.
const REQUEST: Extract<ResearchRequest, { requestUnit: "calendar_month" }> = {
  requestUnit: "calendar_month",
  domain: "allowances",
  year: 2026,
  month: 2,
  parameters: ["per_diem.point_rate", "meal_allowance.rates"],
};
const TASK: ResearchTask = {
  id: "synthetic-allowances",
  specId: SPEC.id,
  specVersion: 1,
  request: REQUEST,
  asOfDate: "2026-02-20",
  currentValues: [],
};
const NOW = new Date("2026-02-20T10:00:00Z");
const perDiem = (patch: Partial<ResearchFinding> = {}): ResearchFinding => ({
  ...FINDING,
  kind: "per_diem.point_rate",
  population: SPEC.population,
  validFrom: "2025-07-01",
  value: { amount: 44.25 },
  quote:
    "Synthetic Israeli civil-service duty per diem category A: 44.25 ILS effective 2025-07-01.",
  ...patch,
});
const meal = (patch: Partial<ResearchFinding> = {}): ResearchFinding => ({
  ...perDiem(),
  kind: "meal_allowance.rates",
  value: { small: 9.25, large: 13.75 },
  quote:
    "Synthetic civil-service meal rates effective 2025-07-01: third shift 26.284 small 9.25 ILS; two overtime hours 26.282 large 13.75 ILS.",
  ...patch,
});
const revision = (item: ResearchFinding): ResearchRevision => ({
  ...item,
  id: item.kind,
  status: "active",
  trust: "official_verified",
  sufficientEvidence: true,
});
const validate = (items: ResearchFinding[], task = TASK) =>
  validateGroundedFindings(task, SPEC, answerFor(task, items));

describe("monthly allowance research", () => {
  it("registers existing kinds and schemas without replacing another domain", () => {
    expect(selectResearchSpec("allowances")).toBe(SPEC);
    expect(planningSpec("allowances")).toBe(SPEC);
    expect(selectResearchSpec("income-tax").domain).toBe("income-tax");
    expect(SPEC.refreshPolicy).toEqual({
      intervalDays: 90,
      unresolvedDays: 30,
    });
    expect(validateAllowanceFinding(perDiem(), TASK)).toEqual([]);
    expect(validateAllowanceFinding(meal(), TASK)).toEqual([]);
  });
  it("requires a single explicit month and rejects wrong kinds, personal subjects and batching", () => {
    const args = [
      "--domain",
      "allowances",
      "--year",
      "2026",
      "--parameters",
      REQUEST.parameters.join(","),
      "--plan",
    ];
    expect(() => parseResearchCommand(args)).toThrow();
    expect(parseResearchCommand([...args, "--month", "2"]).request).toEqual(
      REQUEST,
    );
    for (const tail of [
      ["--month", "2,3"],
      ["--month", "2", "--subject", "employee:1"],
      ["--month", "2", "--store"],
    ])
      expect(() => parseResearchCommand([...args, ...tail])).toThrow();
    expect(() =>
      parseResearchCommand([
        ...args,
        "--month",
        "2",
        "--parameters",
        "income_tax.credit_point",
      ]),
    ).toThrow();
    expect(() =>
      parseResearchCommand([
        "--domain",
        "allowances",
        "--year",
        "2015",
        "--month",
        "10",
        "--parameters",
        "per_diem.point_rate",
        "--plan",
      ]),
    ).toThrow();
  });
  it.each([
    { amount: 0 },
    { amount: -1 },
    { amount: 44.251 },
    { rateA: 44.25 },
    { amount: 44.25, points: 2 },
    {},
  ])("rejects an invalid point value %j", (value) =>
    expect(
      validateAllowanceFinding(perDiem({ value }), TASK).length,
    ).toBeGreaterThan(0),
  );
  it.each([
    { small: 9.25 },
    { large: 13.75 },
    { small: 0, large: 13.75 },
    { small: 9.25, large: -1 },
    { small: 9.25, large: 13.755 },
    { small: 9.25, large: 13.75, noAgreement: 20 },
  ])("rejects partial or altered meal schema %j", (value) =>
    expect(
      validateAllowanceFinding(meal({ value }), TASK).length,
    ).toBeGreaterThan(0),
  );
  it.each([
    "Synthetic civil-service duty per diem category B: 44.25 ILS.",
    "Synthetic civil-service breakfast per diem: 44.25 ILS.",
    "Synthetic private employer category A: 44.25 ILS.",
    "Synthetic civil-service category A: 44.25 USD.",
    "Synthetic civil-service category A: 144.25 ILS.",
    "Synthetic civil-service category A: 44.251 ILS.",
    "Synthetic civil-service category A: -44.25 ILS.",
    "Synthetic civil-service derived category A: 44.25 ILS.",
  ])(
    "keeps mismatched point categories, units and amounts unresolved: %s",
    (quote) => {
      expect(
        validateAllowanceFinding(perDiem({ quote }), TASK).length,
      ).toBeGreaterThan(0);
    },
  );
  it("accepts Hebrew category labels and harmless currency formatting, not code/year prefixes", () => {
    expect(
      validateAllowanceFinding(
        perDiem({
          quote:
            "נתוני בדיקה לעובדי מדינה: תעריף א׳ ₪44.2500 בתוקף מהתאריך הנקוב.",
        }),
        TASK,
      ),
    ).toEqual([]);
    expect(
      validateAllowanceFinding(
        perDiem({
          value: { amount: 44 },
          quote: "Synthetic civil-service category A 44.00 ILS.",
        }),
        TASK,
      ),
    ).toEqual([]);
    expect(
      validateAllowanceFinding(
        perDiem({
          value: { amount: 44 },
          quote: "Synthetic civil-service category A 44.25 ILS.",
        }),
        TASK,
      ).length,
    ).toBeGreaterThan(0);
    expect(
      validateAllowanceFinding(
        meal({ value: { small: 1476, large: 1700 } }),
        TASK,
      ).length,
    ).toBeGreaterThan(0);
  });
  it("requires both literal meal amounts and the correct ordinary versus no-agreement categories", () => {
    for (const quote of [
      "Synthetic civil-service third shift 9.25 ILS; overtime 13.75 ILS.",
      "Synthetic civil-service third shift 9.25 ILS; two overtime hours 13.75 ILS without a meal agreement.",
      "Synthetic civil-service third shift 9.25 ILS; two overtime hours unknown.",
    ])
      expect(
        validateAllowanceFinding(meal({ quote }), TASK).length,
      ).toBeGreaterThan(0);
    expect(
      validateAllowanceFinding(
        meal({
          quote:
            'מקור סינתטי תקשי״ר: 26.284 סכום 9.25 ש"ח; 26.282 סכום 13.75 ש"ח.',
        }),
        TASK,
      ),
    ).toEqual([]);
  });
  it("never completes a partially researched meal pair from current stored information", () => {
    const task = { ...TASK, currentValues: [revision(meal())] };
    const result = validate(
      [meal({ value: { small: 10.25 } }), perDiem()],
      task,
    );
    expect(result.candidates.map((c) => c.kind)).toEqual([
      "per_diem.point_rate",
    ]);
    expect(result.resolvedParameters).toEqual(["per_diem.point_rate"]);
  });
  it("does not swap category amounts or use code 1700 alone to identify ordinary large meals", () => {
    expect(
      validateAllowanceFinding(
        meal({ value: { small: 13.75, large: 9.25 } }),
        TASK,
      ).length,
    ).toBeGreaterThan(0);
    expect(
      validateAllowanceFinding(
        meal({
          quote:
            "Synthetic civil-service third shift 9.25 ILS; 1700 13.75 ILS.",
        }),
        TASK,
      ).length,
    ).toBeGreaterThan(0);
    expect(
      validateAllowanceFinding(
        perDiem({
          quote:
            "Synthetic civil-service category A 20 ILS; category B 44.25 ILS.",
        }),
        TASK,
      ).length,
    ).toBeGreaterThan(0);
  });
  it("preserves real month-aligned validity before the requested year without clipping", () => {
    const result = validate([perDiem(), meal()]);
    expect(result.resolvedParameters).toEqual(REQUEST.parameters);
    expect(result.candidates.map((c) => [c.validFrom, c.validTo])).toEqual([
      ["2025-07-01", null],
      ["2025-07-01", null],
    ]);
  });
  it("reports intramonth boundaries unresolved instead of rounding dates or breaking monthly consumers", () => {
    const result = validate([
      perDiem({ validTo: "2026-02-12" }),
      perDiem({ validFrom: "2026-02-12" }),
      meal(),
    ]);
    expect(result.candidates.map((c) => c.kind)).toEqual([
      "meal_allowance.rates",
    ]);
    expect(result.resolvedParameters).toEqual(["meal_allowance.rates"]);
    expect(result.unresolved.length).toBeGreaterThan(0);
    expect(
      result.unresolved.some(
        (reason) =>
          reason.includes("2026-02-12") &&
          reason.includes("consumer migration"),
      ),
    ).toBe(true);
  });
  it("returns actual unsupported-date and missing-period diagnostics without persisting provider prose", async () => {
    const store = storeWith();
    const research = vi.fn<GroundedResearchProvider["research"]>(
      async (task) => {
        const answer = answerFor(task, [perDiem({ validFrom: "2026-02-12" })]);
        const output = JSON.parse(answer.parts[0]);
        output.missingPeriods = [
          {
            kind: "meal_allowance.rates",
            from: "2026-02-01",
            until: "2026-03-01",
            reason:
              "Synthetic unsupported meal change from 2026-02-12 requires a consumer migration",
          },
        ];
        return { ...answer, parts: [JSON.stringify(output)] };
      },
    );
    const result = await executeResearch(
      REQUEST,
      SPEC,
      { store, provider: { research }, now: () => NOW },
      { persistCandidates: true },
    );
    expect(result.status).toBe("unresolved");
    expect(
      result.unresolved?.some((reason) => reason.includes("2026-02-12")),
    ).toBe(true);
    expect(
      result.unresolved?.some((reason) =>
        reason.includes("meal_allowance.rates: missing"),
      ),
    ).toBe(true);
    expect(store.insertCandidate).not.toHaveBeenCalled();
    expect(store.finish.mock.calls[0][1]).not.toHaveProperty("unresolved");
    expect(research).toHaveBeenCalledTimes(1);
  });
  it("keeps impossible dates, conflicting intervals and uncovered month portions unresolved", () => {
    expect(() => validate([perDiem({ validFrom: "2026-02-30" })])).toThrow(
      "invalid_output",
    );
    expect(
      validate([perDiem(), perDiem({ validFrom: "2026-02-01" })]).candidates,
    ).toEqual([]);
    expect(
      validate([perDiem({ validTo: "2026-03-01" })]).resolvedParameters,
    ).toEqual(["per_diem.point_rate"]);
    expect(() => validate([perDiem({ validTo: "2026-02-01" })])).toThrow(
      "invalid_output",
    );
  });
  it("rejects unsupported grounding, fabricated sources and a wrong population", () => {
    const answer = answerFor(TASK, [perDiem(), meal()]);
    expect(
      validateGroundedFindings(TASK, SPEC, { ...answer, supports: [] })
        .candidates,
    ).toEqual([]);
    expect(
      validate([
        perDiem({ sourceUri: "https://www.gov.il/unattributed-fixture" }),
      ]).candidates,
    ).toEqual([]);
    expect(() =>
      validate([perDiem({ population: "Universal employee entitlement" })]),
    ).toThrow("invalid_output");
  });
  it("treats identified payroll reproductions as attributed secondary evidence, never official verification", () => {
    const uri = "https://www.malam-payroll.com/synthetic-fixture.pdf";
    const answer = answerFor(TASK, [meal({ sourceUri: uri })]);
    const result = validateGroundedFindings(TASK, SPEC, {
      ...answer,
      chunks: [{ uri, title: "Synthetic reproduction", resolvedUri: null }],
    });
    expect(result.candidates[0]).toMatchObject({
      trust: "secondary_grounded",
      fallbackReason: "official_source_insufficient",
    });
    expect(result.candidates[0].sources[0].accessStatus).toBe("not_fetched");
  });
  it("skips sufficiently evidenced historical intervals but not provisional baseline seeds", () => {
    const request = { ...REQUEST, year: 2015, month: 11 };
    const revisions = [
      revision(perDiem({ validFrom: "2015-01-01" })),
      revision(meal({ validFrom: "2015-01-01" })),
    ];
    expect(
      planResearchTask(request, SPEC, { revisions, attempts: [] }, NOW),
    ).toBeNull();
    const baseline = revisions.map((r) => ({
      ...r,
      trust: "legacy_seed" as const,
      sufficientEvidence: false,
    }));
    expect(
      planResearchTask(
        request,
        SPEC,
        { revisions: baseline, attempts: [] },
        NOW,
      )?.request,
    ).toEqual(request);
    expect(
      planResearchTask(
        request,
        SPEC,
        { revisions: [revisions[0]], attempts: [] },
        NOW,
      )?.request.parameters,
    ).toEqual(["meal_allowance.rates"]);
  });
  it("keeps quarterly cadence separate from monthly request units and failed attempts separate from coverage", () => {
    const attempt: ResearchAttempt = {
      id: "prior-check",
      task: { ...TASK, request: { ...REQUEST, month: 1 } },
      state: "completed",
      leaseUntil: "2026-01-25T10:00:00Z",
      nextEligibleAt: "2026-04-25T10:00:00Z",
      finishedAt: "2026-01-25T10:00:00Z",
      resolvedParameters: REQUEST.parameters,
    };
    const snapshot = {
      revisions: [revision(perDiem()), revision(meal())],
      attempts: [attempt],
    };
    expect(planResearchTask(REQUEST, SPEC, snapshot, NOW)).toBeNull();
    expect(
      planResearchTask(
        { ...REQUEST, month: 5 },
        SPEC,
        snapshot,
        new Date("2026-05-01T10:00:00Z"),
      )?.request,
    ).toMatchObject({ month: 5 });
    expect(
      planResearchTask(
        REQUEST,
        SPEC,
        { revisions: [], attempts: [attempt] },
        NOW,
      )?.request,
    ).toEqual(REQUEST);
    const failed: ResearchAttempt = {
      ...attempt,
      task: TASK,
      state: "failed",
      resolvedParameters: [],
    };
    expect(
      planResearchTask(
        REQUEST,
        SPEC,
        { revisions: [], attempts: [failed] },
        NOW,
      ),
    ).toBeNull();
  });
  it("makes one model request for both kinds and creates pending candidates without activation", async () => {
    const store = storeWith();
    const research = vi.fn<GroundedResearchProvider["research"]>(async (task) =>
      answerFor(task, [perDiem(), meal()]),
    );
    const result = await executeResearch(
      REQUEST,
      SPEC,
      { store, provider: { research }, now: () => NOW },
      { persistCandidates: true },
    );
    expect(result.status).toBe("completed");
    expect(research).toHaveBeenCalledTimes(1);
    expect(research.mock.calls[0][0].request).toEqual(REQUEST);
    expect(store.insertCandidate).toHaveBeenCalledTimes(2);
    expect(
      result.candidates?.every((c) => c.trust === "official_grounded"),
    ).toBe(true);
    expect("activate" in store).toBe(false);
  });
  it("creates one changed pair revision when only small changes and both amounts remain supported", async () => {
    const store = storeWith({
      revisions: [revision(perDiem()), revision(meal())],
      attempts: [],
    });
    const research = vi.fn<GroundedResearchProvider["research"]>(async (task) =>
      answerFor(task, [
        perDiem(),
        meal({
          validFrom: "2026-02-01",
          value: { small: 10.25, large: 13.75 },
          quote:
            "Synthetic civil-service effective 2026-02-01: third shift 26.284 10.25 ILS; two overtime hours 26.282 13.75 ILS.",
        }),
      ]),
    );
    const result = await executeResearch(
      REQUEST,
      SPEC,
      { store, provider: { research }, now: () => NOW },
      { force: true, persistCandidates: true },
    );
    expect(result.status).toBe("completed");
    expect(store.insertCandidate).toHaveBeenCalledTimes(1);
    expect(result.candidates?.[0]).toMatchObject({
      kind: "meal_allowance.rates",
      validFrom: "2026-02-01",
      value: { small: 10.25, large: 13.75 },
    });
  });
  it("does not create monthly copies or research covered historical peer kinds", async () => {
    const all = [revision(perDiem()), revision(meal())];
    const store = storeWith({ revisions: all, attempts: [] });
    const research = vi.fn<GroundedResearchProvider["research"]>(async (task) =>
      answerFor(task, [perDiem(), meal()]),
    );
    for (const month of [2, 3])
      expect(
        (
          await executeResearch(
            { ...REQUEST, month },
            SPEC,
            { store, provider: { research }, now: () => NOW },
            { force: true, persistCandidates: true },
          )
        ).candidates,
      ).toEqual([]);
    expect(store.insertCandidate).not.toHaveBeenCalled();
    expect(research).toHaveBeenCalledTimes(2);
    const partialStore = storeWith({ revisions: [all[0]], attempts: [] });
    const targeted = vi.fn<GroundedResearchProvider["research"]>(async (task) =>
      answerFor(task, [meal()]),
    );
    await executeResearch({ ...REQUEST, year: 2025, month: 8 }, SPEC, {
      store: partialStore,
      provider: { research: targeted },
      now: () => NOW,
    });
    expect(targeted.mock.calls[0][0].request.parameters).toEqual([
      "meal_allowance.rates",
    ]);
  });
  it("preserves partial success, safe defaults and provider failure without retries", async () => {
    const store = storeWith();
    const research = vi.fn<GroundedResearchProvider["research"]>(async (task) =>
      answerFor(task, [perDiem(), meal({ value: { small: 9.25 } })]),
    );
    const result = await executeResearch(
      REQUEST,
      SPEC,
      { store, provider: { research }, now: () => NOW },
      { persistCandidates: true },
    );
    expect(result.status).toBe("unresolved");
    expect(result.candidates?.map((c) => c.kind)).toEqual([
      "per_diem.point_rate",
    ]);
    expect(research).toHaveBeenCalledTimes(1);
    const dry = storeWith();
    await executeResearch(REQUEST, SPEC, {
      store: dry,
      provider: { research },
      now: () => NOW,
    });
    expect(dry.insertCandidate).not.toHaveBeenCalled();
    const failure = vi.fn<GroundedResearchProvider["research"]>(async () => {
      throw new Error("Synthetic timeout");
    });
    const failedStore = storeWith();
    expect(
      (
        await executeResearch(REQUEST, SPEC, {
          store: failedStore,
          provider: { research: failure },
          now: () => NOW,
        })
      ).status,
    ).toBe("provider_error");
    expect(failure).toHaveBeenCalledTimes(1);
    expect(failedStore.insertCandidate).not.toHaveBeenCalled();
  });
});
