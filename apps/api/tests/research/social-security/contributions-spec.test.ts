import { spawnSync } from "node:child_process";
import { describe, expect, it, vi } from "vitest";
import {
  CONTRIBUTIONS_RESEARCH_SPEC as SPEC,
  validateContributionFinding,
} from "../../../src/research/social-security/contributions-spec.ts";
import { CONTRIBUTION_KINDS } from "../../../src/research/social-security/employee-contributions.ts";
import {
  RESEARCH_DOMAINS,
  type ResearchRequest,
  type ResearchTask,
  type ResearchFinding,
  type ResearchKind,
  type ResearchRevision,
  type ResearchAttempt,
  type GroundedResearchProvider,
} from "../../../src/research/contracts.ts";
import {
  selectResearchSpec,
  planningSpec,
} from "../../../src/research/spec-registry.ts";
import { parseResearchCommand } from "../../../src/cli/reference-research-command.ts";
import { planResearchTask } from "../../../src/research/planner.ts";
import { validateGroundedFindings } from "../../../src/research/grounded-findings.ts";
import { executeResearch } from "../../../src/research/execute-research.ts";
import { answerFor, storeWith, FINDING } from "../unified/fixtures.ts";

// Deliberately synthetic: these are test parameters, not researched Israeli rates.
const KINDS = RESEARCH_DOMAINS.contributions;
const VALUES = {
  "social_security.reduced_rate_boundary": { amount: 1000 },
  "social_security.max_insurable_income": { amount: 9000 },
  "national_insurance.employee_reduced_rate": { rate: 0.02 },
  "national_insurance.employee_standard_rate": { rate: 0.04 },
  "health_insurance.employee_reduced_rate": { rate: 0.01 },
  "health_insurance.employee_standard_rate": { rate: 0.03 },
};
const NOW = new Date("2026-02-20T10:00:00Z");
const REQUEST: Extract<ResearchRequest, { requestUnit: "calendar_month" }> = {
  requestUnit: "calendar_month",
  domain: "contributions",
  year: 2026,
  month: 2,
  parameters: [...KINDS],
};
const TASK: ResearchTask = {
  id: "synthetic-contributions",
  specId: SPEC.id,
  specVersion: SPEC.version,
  request: REQUEST,
  asOfDate: "2026-02-20",
  currentValues: [],
};
const finding = (
  kind: (typeof KINDS)[number] = "health_insurance.employee_standard_rate",
  patch: Partial<ResearchFinding> = {},
): ResearchFinding => {
  const value = VALUES[kind];
  const literal =
    "amount" in value
      ? `${value.amount} ILS monthly income`
      : `${(value.rate * 100).toFixed(2)}% contribution`;
  return {
    ...FINDING,
    kind,
    population: SPEC.population,
    validFrom: "2025-07-15",
    validTo: null,
    value,
    quote: `Synthetic employee ${literal} effective 2025-07-15; not a real publication.`,
    ...patch,
  };
};
const revision = (
  kind: (typeof KINDS)[number],
  patch: Partial<ResearchRevision> = {},
): ResearchRevision => ({
  ...finding(kind),
  id: kind,
  status: "active",
  trust: "official_verified",
  sufficientEvidence: true,
  ...patch,
});
const taskFor = (parameters: ResearchKind[]): ResearchTask => ({
  ...TASK,
  request: { ...REQUEST, parameters },
});

describe("monthly NI and Health research", () => {
  it("registers the six existing kinds, shared thresholds and unchanged value shapes", () => {
    expect(selectResearchSpec("contributions")).toBe(SPEC);
    expect(planningSpec("contributions")).toBe(SPEC);
    expect(Object.values(CONTRIBUTION_KINDS)).toEqual(KINDS);
    expect(KINDS.filter((k) => k.startsWith("social_security."))).toHaveLength(
      2,
    );
    expect(SPEC.sourcePriority.slice(0, 2)).toEqual([
      "National Insurance Institute (BTL)",
      "Official historical BTL tables and publications",
    ]);
    expect(SPEC.refreshPolicy).toEqual({
      intervalDays: 30,
      unresolvedDays: 30,
    });
  });
  it.each(KINDS)("admits the existing independent value for %s", (kind) => {
    expect(validateContributionFinding(finding(kind), TASK)).toEqual([]);
  });
  it("requires exact year/month, rejects pre-system history and never batches months", () => {
    const args = [
      "--domain",
      "contributions",
      "--parameters",
      KINDS.join(","),
      "--year",
      "2015",
      "--plan",
    ];
    expect(() => parseResearchCommand(args)).toThrow();
    expect(() => parseResearchCommand([...args, "--month", "10"])).toThrow();
    expect(
      parseResearchCommand([...args, "--month", "11"]).request,
    ).toMatchObject({ year: 2015, month: 11, parameters: [...KINDS] });
    expect(() => parseResearchCommand([...args, "--month", "11,12"])).toThrow();
    expect(() =>
      parseResearchCommand([...args, "--month", "11", "--months", "11,12"]),
    ).toThrow();
    expect(() =>
      parseResearchCommand([...args, "--month", "11", "--store"]),
    ).toThrow();
  });
  it.each([
    { rate: 0 },
    { rate: -0.01 },
    { rate: 1 },
    { rate: 3 },
    { amount: 1000 },
    { rate: 0.03, employerRate: 0.05 },
    { rate: 0.03, derived: true },
    {},
  ])("rejects malformed or percentage-point rate values %j", (value) => {
    expect(
      validateContributionFinding(finding(undefined, { value }), TASK).length,
    ).toBeGreaterThan(0);
  });
  it.each([
    { amount: 0 },
    { amount: -1 },
    { amount: 1000.5 },
    { rate: 0.02 },
    { amount: 1000, annual: true },
  ])("rejects invalid or changed threshold schema %j", (value) => {
    expect(
      validateContributionFinding(finding(KINDS[0], { value }), TASK).length,
    ).toBeGreaterThan(0);
  });
  it.each([
    "Synthetic employer contribution is 3.00% effective 2025-07-15.",
    "Synthetic employee contribution is 1% and employer contribution is 3.00%.",
    "Synthetic employee contribution is 4.00% effective 2025-07-15.",
    "Synthetic employee contribution is 3.00 without units.",
    "Synthetic derived employee contribution is 3.00%.",
    "Synthetic employee contribution calculated as total minus NI is 3.00%.",
    "חלק העובד מחושב כשיעור כולל פחות דמי ביטוח לאומי: 3.00%.",
  ])("keeps unsupported or derived rate evidence unresolved: %s", (quote) => {
    expect(
      validateContributionFinding(finding(undefined, { quote }), TASK).length,
    ).toBeGreaterThan(0);
  });
  it("accepts literal Hebrew percentage tables or explicit decimal fractions without confusing their units", () => {
    expect(
      validateContributionFinding(
        finding(undefined, {
          quote:
            "נתוני בדיקה סינתטיים בלבד: חלק העובד באחוזים 3.00 בתוקף מהתאריך המצוין.",
        }),
        TASK,
      ),
    ).toEqual([]);
    expect(
      validateContributionFinding(
        finding(undefined, {
          quote:
            "Synthetic employee decimal fraction 0.03, effective from the stated date.",
        }),
        TASK,
      ),
    ).toEqual([]);
    expect(
      validateContributionFinding(
        finding(KINDS[0], {
          quote: "Synthetic employee annual income 1000 ILS.",
        }),
        TASK,
      ).length,
    ).toBeGreaterThan(0);
    expect(
      validateContributionFinding(
        finding(KINDS[0], {
          quote: "Synthetic employee monthly income 10000 ILS.",
        }),
        TASK,
      ).length,
    ).toBeGreaterThan(0);
  });
  it("rejects a wrong population or task domain instead of silently researching another category", () => {
    expect(() =>
      validateGroundedFindings(
        TASK,
        SPEC,
        answerFor(TASK, [
          finding(undefined, { population: "Non-resident employer" }),
        ]),
      ),
    ).toThrow("invalid_output");
    expect(
      validateContributionFinding(finding(), {
        ...TASK,
        request: { ...REQUEST, domain: "income-tax" },
      }).length,
    ).toBeGreaterThan(0);
  });
  it("retains actual intervals before the requested month/year and both sides of a mid-month change", () => {
    const task = taskFor([KINDS[5]]);
    const result = validateGroundedFindings(
      task,
      SPEC,
      answerFor(task, [
        finding(undefined, { validTo: "2026-02-12" }),
        finding(undefined, {
          validFrom: "2026-02-12",
          value: { rate: 0.035 },
          quote: "Synthetic employee contribution 3.50% effective 2026-02-12.",
        }),
      ]),
    );
    expect(result.resolvedParameters).toEqual([KINDS[5]]);
    expect(result.candidates.map((c) => [c.validFrom, c.validTo])).toEqual([
      ["2025-07-15", "2026-02-12"],
      ["2026-02-12", null],
    ]);
    expect(
      result.candidates.every((c) => c.trust === "official_grounded"),
    ).toBe(true);
  });
  it("rejects impossible dates and does not resolve a month with a gap or overlapping intervals", () => {
    const task = taskFor([KINDS[5]]);
    expect(() =>
      validateGroundedFindings(
        task,
        SPEC,
        answerFor(task, [finding(undefined, { validFrom: "2026-02-30" })]),
      ),
    ).toThrow("invalid_output");
    const gap = validateGroundedFindings(
      task,
      SPEC,
      answerFor(task, [finding(undefined, { validTo: "2026-02-12" })]),
    );
    expect(gap.resolvedParameters).toEqual([]);
    const overlap = validateGroundedFindings(
      task,
      SPEC,
      answerFor(task, [
        finding(),
        finding(undefined, { validFrom: "2026-02-12" }),
      ]),
    );
    expect(overlap.candidates).toEqual([]);
  });
  it("checks overlapping shared thresholds and rejects only the inconsistent parameters", () => {
    const result = validateGroundedFindings(
      TASK,
      SPEC,
      answerFor(TASK, [
        finding(KINDS[0], {
          value: { amount: 10000 },
          quote: "Synthetic employee monthly income boundary 10000 ILS.",
        }),
        finding(KINDS[1]),
        finding(KINDS[5]),
      ]),
    );
    expect(result.candidates.map((c) => c.kind)).toEqual([KINDS[5]]);
    expect(result.resolvedParameters).toEqual([KINDS[5]]);
  });
  it("rejects reduced rates above their simultaneously applicable standard rates", () => {
    const result = validateGroundedFindings(
      TASK,
      SPEC,
      answerFor(TASK, [
        finding(KINDS[4], {
          value: { rate: 0.04 },
          quote: "Synthetic employee contribution 4.00%.",
        }),
        finding(KINDS[5]),
        finding(KINDS[0]),
      ]),
    );
    expect(result.candidates.map((c) => c.kind)).toEqual([KINDS[0]]);
  });
  it("does not compare parameters from disjoint effective intervals or invent a missing peer", () => {
    const result = validateGroundedFindings(
      TASK,
      SPEC,
      answerFor(TASK, [
        finding(KINDS[4], {
          validTo: "2026-02-12",
          value: { rate: 0.04 },
          quote: "Synthetic employee contribution 4.00%.",
        }),
        finding(KINDS[5], { validFrom: "2026-02-12" }),
      ]),
    );
    expect(result.candidates).toHaveLength(2);
    const single = taskFor([KINDS[0]]);
    expect(
      validateGroundedFindings(
        single,
        SPEC,
        answerFor(single, [finding(KINDS[0])]),
      ).resolvedParameters,
    ).toEqual([KINDS[0]]);
  });
  it("does not use ungrounded peers to reject otherwise supported findings", () => {
    const unsupported = finding(KINDS[0], {
      sourceUri: "https://www.gov.il/unattributed-fixture",
      value: { amount: 10000 },
      quote: "Synthetic employee monthly income 10000 ILS.",
    });
    const result = validateGroundedFindings(
      TASK,
      SPEC,
      answerFor(TASK, [unsupported, finding(KINDS[1])]),
    );
    expect(result.candidates.map((c) => c.kind)).toEqual([KINDS[1]]);
  });
  it("rejects impossible combined employee rates without deriving any missing value", () => {
    const result = validateGroundedFindings(
      TASK,
      SPEC,
      answerFor(TASK, [
        finding(KINDS[3], {
          value: { rate: 0.8 },
          quote: "Synthetic employee contribution 80%.",
        }),
        finding(KINDS[5], {
          value: { rate: 0.3 },
          quote: "Synthetic employee contribution 30%.",
        }),
        finding(KINDS[0]),
      ]),
    );
    expect(result.candidates.map((c) => c.kind)).toEqual([KINDS[0]]);
  });
  it("fails closed on unavailable grounding and fabricated citation URLs", () => {
    const task = taskFor([KINDS[5]]);
    const answer = answerFor(task, [finding()]);
    expect(
      validateGroundedFindings(task, SPEC, { ...answer, supports: [] })
        .candidates,
    ).toEqual([]);
    expect(
      validateGroundedFindings(
        task,
        SPEC,
        answerFor(task, [
          finding(undefined, {
            sourceUri: "https://www.btl.gov.il/fabricated-fixture",
          }),
        ]),
      ).candidates,
    ).toEqual([]);
  });
  it("preserves provider-attributed secondary fallback without upgrading it to verified", () => {
    const task = taskFor([KINDS[5]]);
    const uri = "https://www.kolzchut.org.il/he/synthetic-fixture";
    const answer = answerFor(task, [finding(undefined, { sourceUri: uri })]);
    const result = validateGroundedFindings(task, SPEC, {
      ...answer,
      chunks: [{ uri, title: "Synthetic secondary source", resolvedUri: null }],
    });
    expect(result.candidates[0]).toMatchObject({
      trust: "secondary_grounded",
      fallbackReason: "official_source_insufficient",
    });
    expect(result.candidates[0].sources[0].accessStatus).toBe("not_fetched");
  });
  it("plans only a missing historical parameter and skips covered periods from system start", () => {
    const historical = { ...REQUEST, year: 2015, month: 11 };
    const all = KINDS.map((kind) =>
      revision(kind, { validFrom: "2015-01-01" }),
    );
    expect(
      planResearchTask(historical, SPEC, { revisions: all, attempts: [] }, NOW),
    ).toBeNull();
    const partial = all.filter((r) => r.kind !== KINDS[5]);
    expect(
      planResearchTask(
        historical,
        SPEC,
        { revisions: partial, attempts: [] },
        NOW,
      )!.request,
    ).toMatchObject({ year: 2015, month: 11, parameters: [KINDS[5]] });
    const insufficient = all.map((r) =>
      r.kind === KINDS[5] ? { ...r, sufficientEvidence: false } : r,
    );
    expect(
      planResearchTask(
        historical,
        SPEC,
        { revisions: insufficient, attempts: [] },
        NOW,
      )!.request.parameters,
    ).toEqual([KINDS[5]]);
  });
  it("keeps cadence independent of granularity and unsuccessful attempts separate from coverage", () => {
    const request = { ...REQUEST, parameters: [KINDS[5]] };
    const attempt: ResearchAttempt = {
      id: "prior-check",
      task: { ...TASK, request: { ...request, month: 1 } },
      state: "completed",
      leaseUntil: "2026-01-25T10:00:00Z",
      nextEligibleAt: "2026-02-24T10:00:00Z",
      finishedAt: "2026-01-25T10:00:00Z",
      resolvedParameters: [KINDS[5]],
    };
    const snapshot = { revisions: [revision(KINDS[5])], attempts: [attempt] };
    expect(planResearchTask(request, SPEC, snapshot, NOW)).toBeNull();
    expect(
      planResearchTask(
        request,
        SPEC,
        snapshot,
        new Date("2026-02-25T10:00:00Z"),
      )?.request,
    ).toEqual(request);
    expect(
      planResearchTask(
        request,
        SPEC,
        { revisions: [], attempts: [attempt] },
        NOW,
      )?.request,
    ).toEqual(request);
    const failed: ResearchAttempt = {
      ...attempt,
      task: { ...TASK, request },
      state: "failed",
      resolvedParameters: [],
    };
    expect(
      planResearchTask(
        request,
        SPEC,
        { revisions: [], attempts: [failed] },
        NOW,
      ),
    ).toBeNull();
    expect(
      planResearchTask(
        request,
        SPEC,
        { revisions: [], attempts: [failed] },
        new Date("2026-02-25T10:00:00Z"),
      )?.request,
    ).toEqual(request);
  });
  it("makes one grouped request and produces six independent pending candidates without activation", async () => {
    const store = storeWith();
    const research = vi.fn<GroundedResearchProvider["research"]>(async (task) =>
      answerFor(
        task,
        KINDS.map((kind) => finding(kind)),
      ),
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
    expect(store.insertCandidate).toHaveBeenCalledTimes(6);
    expect(result.candidates?.map((c) => c.kind)).toEqual(KINDS);
    expect("activate" in store).toBe(false);
  });
  it("creates only the changed Health interval while the other five parameters remain unchanged", async () => {
    const store = storeWith({
      revisions: KINDS.map((kind) => revision(kind)),
      attempts: [],
    });
    const research = vi.fn<GroundedResearchProvider["research"]>(async (task) =>
      answerFor(task, [
        ...KINDS.filter((kind) => kind !== KINDS[5]).map((kind) =>
          finding(kind),
        ),
        finding(undefined, { validTo: "2026-02-12" }),
        finding(undefined, {
          validFrom: "2026-02-12",
          value: { rate: 0.035 },
          quote: "Synthetic employee contribution 3.50% effective 2026-02-12.",
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
    expect(research).toHaveBeenCalledTimes(1);
    expect(store.insertCandidate).toHaveBeenCalledTimes(1);
    expect(result.candidates?.[0]).toMatchObject({
      kind: KINDS[5],
      validFrom: "2026-02-12",
      validTo: null,
      value: { rate: 0.035 },
    });
  });
  it("does not research covered historical peers when only Health is missing", async () => {
    const request = { ...REQUEST, year: 2016, month: 2 };
    const revisions = KINDS.filter((kind) => kind !== KINDS[5]).map((kind) =>
      revision(kind, { validFrom: "2015-01-01" }),
    );
    const store = storeWith({ revisions, attempts: [] });
    const research = vi.fn<GroundedResearchProvider["research"]>(async (task) =>
      answerFor(task, [finding(undefined, { validFrom: "2015-01-01" })]),
    );
    const result = await executeResearch(
      request,
      SPEC,
      { store, provider: { research }, now: () => NOW },
      { persistCandidates: true },
    );
    expect(result.status).toBe("completed");
    expect(research.mock.calls[0][0].request.parameters).toEqual([KINDS[5]]);
    expect(store.insertCandidate).toHaveBeenCalledTimes(1);
  });
  it("does not duplicate unchanged revisions across separate explicit monthly tasks", async () => {
    const store = storeWith({
      revisions: KINDS.map((kind) => revision(kind)),
      attempts: [],
    });
    const research = vi.fn<GroundedResearchProvider["research"]>(async (task) =>
      answerFor(
        task,
        KINDS.map((kind) => finding(kind)),
      ),
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
  it("preserves partial success without retries and does not persist a derived replacement", async () => {
    const store = storeWith();
    const research = vi.fn<GroundedResearchProvider["research"]>(async (task) =>
      answerFor(task, [
        finding(KINDS[0]),
        finding(undefined, {
          quote:
            "Synthetic derived employee contribution calculated as total minus NI: 3%.",
        }),
      ]),
    );
    const result = await executeResearch(
      REQUEST,
      SPEC,
      { store, provider: { research }, now: () => NOW },
      { persistCandidates: true },
    );
    expect(result.status).toBe("unresolved");
    expect(research).toHaveBeenCalledTimes(1);
    expect(result.candidates?.map((c) => c.kind)).toEqual([KINDS[0]]);
    expect(store.finish.mock.calls[0][1].resolvedParameters).toEqual([
      KINDS[0],
    ]);
  });
  it("honors live leases, review suppression, and provider errors without extra requests", async () => {
    const attempt: ResearchAttempt = {
      id: "leased",
      task: TASK,
      state: "dispatched",
      leaseUntil: "2026-02-21T10:00:00Z",
      nextEligibleAt: "2026-03-21T10:00:00Z",
      finishedAt: null,
      resolvedParameters: [],
    };
    const research = vi.fn<GroundedResearchProvider["research"]>(async () => {
      throw new Error("Synthetic provider timeout");
    });
    const busyStore = storeWith({ revisions: [], attempts: [attempt] });
    expect(
      (
        await executeResearch(
          REQUEST,
          SPEC,
          { store: busyStore, provider: { research }, now: () => NOW },
          { force: true },
        )
      ).status,
    ).toBe("skipped");
    const pendingStore = storeWith({
      revisions: KINDS.map((kind) =>
        revision(kind, { status: "pending_review" }),
      ),
      attempts: [],
    });
    expect(
      (
        await executeResearch(REQUEST, SPEC, {
          store: pendingStore,
          provider: { research },
          now: () => NOW,
        })
      ).status,
    ).toBe("skipped");
    expect(research).not.toHaveBeenCalled();
    const store = storeWith();
    expect(
      (
        await executeResearch(
          REQUEST,
          SPEC,
          { store, provider: { research }, now: () => NOW },
          { persistCandidates: true },
        )
      ).status,
    ).toBe("provider_error");
    expect(research).toHaveBeenCalledTimes(1);
    expect(store.insertCandidate).not.toHaveBeenCalled();
  });
  it("keeps operational candidate persistence disabled by default", async () => {
    const store = storeWith();
    const research = vi.fn<GroundedResearchProvider["research"]>(async (task) =>
      answerFor(
        task,
        KINDS.map((kind) => finding(kind)),
      ),
    );
    const result = await executeResearch(REQUEST, SPEC, {
      store,
      provider: { research },
      now: () => NOW,
    });
    expect(result.candidates).toHaveLength(6);
    expect(store.insertCandidate).not.toHaveBeenCalled();
    expect(result.status).toBe("unresolved");
    expect(store.finish.mock.calls[0][1].resolvedParameters).toEqual([]);
  });
  it("retires the old full-history CLI and --store without credentials or side effects", () => {
    const result = spawnSync(
      process.execPath,
      [
        new URL("../../../src/cli/research-contributions.ts", import.meta.url)
          .pathname,
        "--store",
      ],
      { encoding: "utf8", env: {} },
    );
    expect(result.status).toBe(1);
    expect(result.stdout).toBe("");
    expect(JSON.parse(result.stderr)).toMatchObject({
      error: "research_command_retired",
    });
    expect(result.stderr).toContain("--year, --month, --parameters");
  });
});
