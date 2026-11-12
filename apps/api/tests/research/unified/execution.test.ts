import { describe, expect, it, vi } from "vitest";
import { executeResearch } from "../../../src/research/execute-research.ts";
import type {
  GroundedResearchProvider,
  ResearchSpec,
} from "../../../src/research/contracts.ts";
import { REQUEST, SPEC, FINDING, answerFor, storeWith } from "./fixtures.ts";

const NOW = new Date("2026-02-20T10:00:00.000Z");
const providerWith = () => ({
  research: vi.fn<GroundedResearchProvider["research"]>(async (task) =>
    answerFor(task),
  ),
});

describe("unified research execution", () => {
  it("measures completion against the parameters actually dispatched after coverage filtering", async () => {
    const store = storeWith({
      attempts: [],
      revisions: [
        {
          id: "pending-brackets",
          kind: "income_tax.monthly_brackets",
          subjectKey: null,
          status: "pending_review",
          validFrom: "2026-01-01",
          validTo: null,
          value: { brackets: [] },
          trust: "manual",
          sufficientEvidence: false,
        },
      ],
    });
    const provider = providerWith();
    const result = await executeResearch(
      {
        ...REQUEST,
        parameters: ["income_tax.monthly_brackets", "income_tax.credit_point"],
      },
      SPEC,
      { store, provider, now: () => NOW },
      { persistCandidates: true },
    );
    expect(provider.research.mock.calls[0][0].request.parameters).toEqual([
      "income_tax.credit_point",
    ]);
    expect(provider.research.mock.calls[0][0].id).toBe("attempt");
    expect(result.status).toBe("completed");
  });
  it("preserves pending revision ids if finishing the operational attempt fails", async () => {
    const store = storeWith();
    const provider = providerWith();
    store.finish.mockRejectedValueOnce(new Error("DB unavailable"));
    const result = await executeResearch(
      REQUEST,
      SPEC,
      { store, provider, now: () => NOW },
      { persistCandidates: true },
    );
    expect(result).toMatchObject({
      status: "persistence_failed",
      attemptId: "attempt",
      candidateIds: ["pending-revision"],
    });
    expect(provider.research).toHaveBeenCalledTimes(1);
  });
  it("dispatches once, prepares grounded candidates, and defaults to no reference writes", async () => {
    const store = storeWith();
    const provider = providerWith();
    const result = await executeResearch(REQUEST, SPEC, {
      store,
      provider,
      now: () => NOW,
    });
    expect(provider.research).toHaveBeenCalledTimes(1);
    expect(store.dispatch).toHaveBeenCalledTimes(1);
    expect(store.insertCandidate).not.toHaveBeenCalled();
    expect(result.candidates?.[0].trust).toBe("official_grounded");
    expect(store.finish).toHaveBeenCalledWith(
      { id: "attempt", token: "owner" },
      expect.objectContaining({
        outcome: "unresolved",
        resolvedParameters: [],
        candidateIds: [],
        provider: {
          model: "synthetic-model",
          durationMs: 0,
          usage: { totalTokenCount: 1 },
        },
      }),
      "2026-03-22T10:00:00.000Z",
    );
  });
  it("persists only pending candidates when explicitly requested through the injected port", async () => {
    const store = storeWith();
    const provider = providerWith();
    const result = await executeResearch(
      REQUEST,
      SPEC,
      { store, provider, now: () => NOW },
      { persistCandidates: true },
    );
    expect(result).toMatchObject({
      status: "completed",
      candidateIds: ["pending-revision"],
    });
    expect(store.insertCandidate).toHaveBeenCalledTimes(1);
    expect("activate" in store).toBe(false);
  });
  it("never calls the provider when state is unavailable, claimed elsewhere or pending review", async () => {
    const provider = providerWith();
    const store = storeWith();
    store.read.mockRejectedValueOnce(new Error("DB unavailable"));
    await expect(
      executeResearch(REQUEST, SPEC, { store, provider, now: () => NOW }),
    ).rejects.toThrow();
    const busy = storeWith();
    busy.claim.mockResolvedValueOnce(null);
    expect(
      (
        await executeResearch(REQUEST, SPEC, {
          store: busy,
          provider,
          now: () => NOW,
        })
      ).status,
    ).toBe("skipped");
    const pending = storeWith({
      attempts: [],
      revisions: [
        {
          id: "pending",
          kind: FINDING.kind,
          subjectKey: null,
          status: "pending_review",
          validFrom: "2026-01-01",
          validTo: null,
          trust: "official_grounded",
          sufficientEvidence: true,
          value: FINDING.value,
        },
      ],
    });
    expect(
      (
        await executeResearch(REQUEST, SPEC, {
          store: pending,
          provider,
          now: () => NOW,
        })
      ).status,
    ).toBe("skipped");
    expect(provider.research).not.toHaveBeenCalled();
  });
  it("records provider failures without retries or leaking raw errors", async () => {
    const store = storeWith();
    const provider = providerWith();
    provider.research.mockRejectedValueOnce(
      new Error("secret in provider body"),
    );
    expect(
      (
        await executeResearch(REQUEST, SPEC, {
          store,
          provider,
          now: () => NOW,
        })
      ).status,
    ).toBe("provider_error");
    expect(provider.research).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(store.finish.mock.calls)).not.toContain("secret");
  });
  it("does not create another monthly revision when actual effective coverage is unchanged", async () => {
    const store = storeWith({
      attempts: [],
      revisions: [
        {
          id: "active",
          kind: FINDING.kind,
          subjectKey: null,
          status: "active",
          validFrom: FINDING.validFrom,
          validTo: null,
          trust: "official_verified",
          sufficientEvidence: true,
          value: FINDING.value,
        },
      ],
    });
    const provider = providerWith();
    const result = await executeResearch(
      REQUEST,
      SPEC,
      { store, provider, now: () => NOW },
      { persistCandidates: true },
    );
    expect(result.status).toBe("completed");
    expect(result.candidates).toEqual([]);
    expect(store.insertCandidate).not.toHaveBeenCalled();
  });
  it("loses ownership safely without persisting or resending inference", async () => {
    const store = storeWith();
    store.isOwner.mockResolvedValue(false);
    const provider = providerWith();
    expect(
      (
        await executeResearch(
          REQUEST,
          SPEC,
          { store, provider, now: () => NOW },
          { persistCandidates: true },
        )
      ).status,
    ).toBe("lost_ownership");
    expect(store.insertCandidate).not.toHaveBeenCalled();
    expect(store.finish).not.toHaveBeenCalled();
    expect(provider.research).toHaveBeenCalledTimes(1);
  });
  it("reports partial storage and keeps already-created candidates without another model request", async () => {
    const store = storeWith();
    const provider = providerWith();
    provider.research.mockImplementation(async (task) =>
      answerFor(task, [
        { ...FINDING, validTo: "2026-02-15" },
        { ...FINDING, validFrom: "2026-02-15", value: { monthlyValue: 456 } },
      ]),
    );
    store.insertCandidate
      .mockResolvedValueOnce("pending-first")
      .mockRejectedValueOnce(new Error("DB failure"));
    const result = await executeResearch(
      REQUEST,
      SPEC,
      { store, provider, now: () => NOW },
      { persistCandidates: true },
    );
    expect(result.status).toBe("persistence_failed");
    expect(result.candidateIds).toEqual(["pending-first"]);
    expect(provider.research).toHaveBeenCalledTimes(1);
  });
  it("uses the same foundation for contribution parameter schemas without yearly snapshots", async () => {
    const spec: ResearchSpec = {
      ...SPEC,
      id: "synthetic-contributions",
      domain: "contributions",
      validateFinding: (f) =>
        typeof f.value === "object" && f.value !== null && "rate" in f.value
          ? []
          : ["Invalid value"],
    };
    const request = {
      requestUnit: "calendar_month",
      domain: "contributions",
      year: 2026,
      month: 2,
      parameters: ["health_insurance.employee_standard_rate"],
    } as const;
    const store = storeWith();
    const provider = providerWith();
    provider.research.mockImplementation(async (task) =>
      answerFor(task, [
        {
          ...FINDING,
          kind: "health_insurance.employee_standard_rate",
          value: { rate: 0.123 },
        },
      ]),
    );
    expect(
      (
        await executeResearch(
          { ...request, parameters: [...request.parameters] },
          spec,
          { store, provider, now: () => NOW },
        )
      ).candidates?.[0].value,
    ).toEqual({ rate: 0.123 });
  });
});
