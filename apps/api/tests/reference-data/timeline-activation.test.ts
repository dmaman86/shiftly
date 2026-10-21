import { describe, expect, it } from "vitest";
import type { RevisionDetails } from "../../src/reference-data/ports.ts";
import { checkTimelineActivation } from "../../src/reference-data/timeline-activation.ts";

const PENDING: RevisionDetails = {
  id: "rev-1",
  kind: "per_diem.point_rate",
  subjectKey: null,
  status: "pending_review",
  validFrom: "2015-11-01",
  validTo: "2021-01-01",
  value: { amount: 29.5 },
  origin: "seed",
  trust: "legacy_seed",
};

describe("checkTimelineActivation", () => {
  it("allows a pending timeline revision", () => {
    expect(checkTimelineActivation("rev-1", PENDING)).toEqual({
      ok: true,
      revision: PENDING,
    });
  });

  it("allows any timeline kind, not only rates", () => {
    const incomeTax = { ...PENDING, kind: "income_tax.credit_point" as const };

    expect(checkTimelineActivation("rev-1", incomeTax).ok).toBe(true);
  });

  it.each<[string, RevisionDetails | null, string]>([
    ["a missing revision", null, "revision rev-1 not found"],
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
      "a rejected revision",
      { ...PENDING, status: "rejected" },
      "revision rev-1 is rejected, not pending_review",
    ],
    [
      "a subject-keyed revision",
      {
        ...PENDING,
        kind: "calendar.knesset_election",
        subjectKey: "knesset:26",
      },
      "revision rev-1 belongs to subject knesset:26; activate it with its own command",
    ],
  ])("refuses %s", (_, revision, problem) => {
    expect(checkTimelineActivation("rev-1", revision)).toEqual({
      ok: false,
      problem,
    });
  });
});
