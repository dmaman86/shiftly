import { describe, expect, it, vi } from "vitest";
import { candidateIdentityProblem } from "../../src/reference-data/candidate-identity.ts";
import type {
  NewCandidate,
  RevisionRepository,
} from "../../src/reference-data/ports.ts";
import { storeCandidates } from "../../src/reference-data/store-candidates.ts";

const ELECTION: NewCandidate = {
  kind: "calendar.knesset_election",
  subjectKey: "knesset:26",
  validFrom: "2026-10-27",
  validTo: "2026-10-28",
  value: { knessetNumber: 26, electionStatus: "planned" },
  origin: "seed",
  trust: "legacy_seed",
  fallbackReason: null,
  sources: [],
  evidence: [],
};

const CREDIT_POINT: NewCandidate = {
  ...ELECTION,
  kind: "income_tax.credit_point",
  subjectKey: null,
  validFrom: "2026-01-01",
  validTo: null,
  value: { monthlyValue: 242 },
};

describe("candidateIdentityProblem", () => {
  it("accepts an election identified by its Knesset number", () => {
    expect(candidateIdentityProblem(ELECTION)).toBeNull();
  });

  it("requires a subjectKey for Knesset elections", () => {
    expect(candidateIdentityProblem({ ...ELECTION, subjectKey: null })).toBe(
      "calendar.knesset_election requires a subjectKey",
    );
  });

  it("rejects an election subject in another format", () => {
    for (const subjectKey of ["2026-10-27", "knesset:", "knesset:026"]) {
      expect(
        candidateIdentityProblem({ ...ELECTION, subjectKey }),
      ).not.toBeNull();
    }
  });

  it("accepts kinds without subjects only with a null subjectKey", () => {
    expect(candidateIdentityProblem(CREDIT_POINT)).toBeNull();
    expect(
      candidateIdentityProblem({ ...CREDIT_POINT, subjectKey: "year:2026" }),
    ).toBe("income_tax.credit_point has no subjects, got subjectKey year:2026");
  });
});

describe("storeCandidates identity check", () => {
  it("stores nothing from a batch with a candidate that lacks its subject", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const insertCandidate = vi.fn(async () => "rev-1");
    const repository: RevisionRepository = {
      insertCandidate,
      findActive: vi.fn(),
      findStartingIn: vi.fn(),
    };

    const outcome = await storeCandidates(repository, [
      CREDIT_POINT,
      { ...ELECTION, subjectKey: null },
    ]);

    expect(outcome).toEqual({
      status: "failed",
      revisions: [],
      error: "calendar.knesset_election requires a subjectKey",
    });
    expect(insertCandidate).not.toHaveBeenCalled();
    errorLog.mockRestore();
  });
});
