import { describe, expect, it } from "vitest";
import { checkElectionActivation } from "../../src/reference-data/election-activation.ts";
import type { RevisionDetails } from "../../src/reference-data/ports.ts";

const PENDING: RevisionDetails = {
  id: "rev-1",
  kind: "calendar.knesset_election",
  subjectKey: "knesset:26",
  status: "pending_review",
  validFrom: "2026-10-27",
  validTo: "2026-10-28",
  value: { knessetNumber: 26, electionStatus: "occurred" },
  origin: "manual",
  trust: "official_verified",
};

describe("checkElectionActivation", () => {
  it("allows a pending Knesset election", () => {
    expect(checkElectionActivation("rev-1", PENDING)).toEqual({
      ok: true,
      revision: PENDING,
    });
  });

  it.each<[string, RevisionDetails | null, string]>([
    ["a missing revision", null, "revision rev-1 not found"],
    [
      "another kind",
      { ...PENDING, kind: "income_tax.credit_point", subjectKey: null },
      "revision rev-1 is income_tax.credit_point, not a Knesset election",
    ],
    [
      "an active revision",
      { ...PENDING, status: "active" },
      "revision rev-1 is active, not pending_review",
    ],
    [
      "a superseded revision",
      { ...PENDING, status: "superseded" },
      "revision rev-1 is superseded, not pending_review",
    ],
    [
      "a revision without subject",
      { ...PENDING, subjectKey: null },
      "revision rev-1 has no subject",
    ],
  ])("refuses %s", (_, revision, problem) => {
    expect(checkElectionActivation("rev-1", revision)).toEqual({
      ok: false,
      problem,
    });
  });
});
