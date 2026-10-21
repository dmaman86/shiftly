import { describe, expect, it, vi } from "vitest";
import {
  ReferenceDataPersistenceError,
  type NewCandidate,
} from "../../src/reference-data/ports.ts";
import { SupabaseRevisionRepository } from "../../src/reference-data/supabase-revision-repository.ts";

const URL_ = "https://project.supabase.co";
const SECRET = "sb_secret_test";

const CANDIDATE: NewCandidate = {
  kind: "income_tax.credit_point",
  subjectKey: null,
  validFrom: "2026-01-01",
  validTo: null,
  value: { monthlyValue: 242 },
  origin: "research",
  trust: "official_verified",
  fallbackReason: null,
  sources: [],
  evidence: [],
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

function repositoryWith(response: Response) {
  const fetch = vi.fn<typeof globalThis.fetch>(async () => response.clone());
  const repository = new SupabaseRevisionRepository({
    url: URL_,
    secretKey: SECRET,
    fetch,
  });
  const request = () => {
    const [input, init] = fetch.mock.calls[0];
    return {
      url: new URL(String(input)),
      method: init?.method,
      headers: new Headers(init?.headers),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    };
  };
  return { repository, fetch, request };
}

describe("SupabaseRevisionRepository", () => {
  it("stores a candidate through the atomic RPC with the secret key", async () => {
    const { repository, request } = repositoryWith(json("rev-1"));

    expect(await repository.insertCandidate(CANDIDATE)).toBe("rev-1");

    const sent = request();
    expect(sent.method).toBe("POST");
    expect(sent.url.pathname).toBe("/rest/v1/rpc/insert_reference_candidate");
    expect(sent.headers.get("apikey")).toBe(SECRET);
    expect(sent.body).toEqual({
      p_kind: "income_tax.credit_point",
      p_subject_key: null,
      p_valid_from: "2026-01-01",
      p_valid_to: null,
      p_value: { monthlyValue: 242 },
      p_origin: "research",
      p_trust: "official_verified",
      p_fallback_reason: null,
      p_sources: [],
      p_evidence: [],
    });
  });

  it("turns a rejected candidate into a persistence error", async () => {
    const { repository } = repositoryWith(
      json(
        {
          code: "P0001",
          message: "trust official_verified is not backed by matching evidence",
        },
        400,
      ),
    );
    await expect(repository.insertCandidate(CANDIDATE)).rejects.toThrow(
      new ReferenceDataPersistenceError(
        "insert_reference_candidate failed: trust official_verified is not backed by matching evidence",
      ),
    );
  });

  it("reads the active revision covering a date", async () => {
    const { repository, request } = repositoryWith(
      json([
        {
          id: "rev-1",
          kind: "income_tax.credit_point",
          subject_key: null,
          valid_from: "2026-01-01",
          valid_to: null,
          value: { monthlyValue: 242 },
          trust: "official_verified",
        },
      ]),
    );

    expect(
      await repository.findActive("income_tax.credit_point", "2026-07-01"),
    ).toEqual({
      id: "rev-1",
      kind: "income_tax.credit_point",
      subjectKey: null,
      validFrom: "2026-01-01",
      validTo: null,
      value: { monthlyValue: 242 },
      trust: "official_verified",
    });
    const { url } = request();
    expect(url.pathname).toBe("/rest/v1/reference_revisions");
    expect(url.searchParams.get("kind")).toBe("eq.income_tax.credit_point");
    expect(url.searchParams.get("status")).toBe("eq.active");
    expect(url.searchParams.get("valid_from")).toBe("lte.2026-07-01");
    expect(url.searchParams.get("or")).toBe(
      "(valid_to.is.null,valid_to.gt.2026-07-01)",
    );
  });

  it("returns null when no revision is active on that date", async () => {
    const { repository } = repositoryWith(json([]));
    expect(
      await repository.findActive("income_tax.credit_point", "2019-07-01"),
    ).toBeNull();
  });

  it("rejects a date that is not YYYY-MM-DD before building the filter", async () => {
    const { repository, fetch } = repositoryWith(json([]));
    await expect(
      repository.findActive(
        "income_tax.credit_point",
        "2026-07-01,status.eq.rejected",
      ),
    ).rejects.toThrow(ReferenceDataPersistenceError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("lists active and pending revisions that start within a period", async () => {
    const { repository, request } = repositoryWith(
      json([
        {
          id: "rev-1",
          subject_key: null,
          status: "pending_review",
          valid_from: "2026-01-01",
          trust: "official_verified",
        },
      ]),
    );

    expect(
      await repository.findStartingIn(
        "income_tax.credit_point",
        "2026-01-01",
        "2027-01-01",
      ),
    ).toEqual([
      {
        id: "rev-1",
        subjectKey: null,
        status: "pending_review",
        validFrom: "2026-01-01",
        trust: "official_verified",
      },
    ]);
    const { url } = request();
    expect(url.pathname).toBe("/rest/v1/reference_revisions");
    expect(url.searchParams.get("kind")).toBe("eq.income_tax.credit_point");
    expect(url.searchParams.get("status")).toBe("in.(active,pending_review)");
    // An open-ended revision from an earlier year does not start in the period.
    expect(url.searchParams.getAll("valid_from")).toEqual([
      "gte.2026-01-01",
      "lt.2027-01-01",
    ]);
  });

  it("sends the subject of a subject-keyed candidate", async () => {
    const { repository, request } = repositoryWith(json("rev-26"));

    await repository.insertCandidate({
      ...CANDIDATE,
      kind: "calendar.knesset_election",
      subjectKey: "knesset:26",
      validFrom: "2026-10-27",
      validTo: "2026-10-28",
      value: { knessetNumber: 26, electionStatus: "planned" },
      origin: "seed",
      trust: "legacy_seed",
    });

    expect(request().body).toMatchObject({
      p_kind: "calendar.knesset_election",
      p_subject_key: "knesset:26",
      p_valid_from: "2026-10-27",
      p_valid_to: "2026-10-28",
    });
  });

  describe("administration", () => {
    const ROW_26 = {
      id: "rev-26",
      kind: "calendar.knesset_election",
      subject_key: "knesset:26",
      valid_from: "2026-10-27",
      valid_to: "2026-10-28",
      value: { knessetNumber: 26, electionStatus: "planned" },
      trust: "legacy_seed",
    };

    it("reads the active revision of a subject, whatever its period", async () => {
      const { repository, request } = repositoryWith(json([ROW_26]));

      expect(
        await repository.findActiveSubject(
          "calendar.knesset_election",
          "knesset:26",
        ),
      ).toMatchObject({ id: "rev-26", subjectKey: "knesset:26" });
      const { url } = request();
      expect(url.searchParams.get("kind")).toBe("eq.calendar.knesset_election");
      expect(url.searchParams.get("subject_key")).toBe("eq.knesset:26");
      expect(url.searchParams.get("status")).toBe("eq.active");
      expect(url.searchParams.has("valid_from")).toBe(false);
    });

    it("reads one revision with its status and origin", async () => {
      const { repository, request } = repositoryWith(
        json([{ ...ROW_26, status: "pending_review", origin: "manual" }]),
      );

      expect(await repository.findRevision("rev-26")).toEqual({
        id: "rev-26",
        kind: "calendar.knesset_election",
        subjectKey: "knesset:26",
        status: "pending_review",
        validFrom: "2026-10-27",
        validTo: "2026-10-28",
        value: { knessetNumber: 26, electionStatus: "planned" },
        origin: "manual",
        trust: "legacy_seed",
      });
      expect(request().url.searchParams.get("id")).toBe("eq.rev-26");
    });

    it("returns null for an unknown revision", async () => {
      const { repository } = repositoryWith(json([]));
      expect(await repository.findRevision("rev-unknown")).toBeNull();
    });

    it("activates through the atomic RPC, recording the reviewer", async () => {
      const { repository, request } = repositoryWith(
        new Response(null, { status: 204 }),
      );

      await repository.activate("rev-26", "reviewer");

      const sent = request();
      expect(sent.url.pathname).toBe(
        "/rest/v1/rpc/activate_reference_revision",
      );
      expect(sent.headers.get("apikey")).toBe(SECRET);
      expect(sent.body).toEqual({
        p_revision_id: "rev-26",
        p_reviewer: "reviewer",
      });
    });

    it("turns a refused activation into a persistence error", async () => {
      const { repository } = repositoryWith(
        json(
          {
            code: "P0001",
            message: "reference revision rev-26 is active, not pending_review",
          },
          400,
        ),
      );

      await expect(repository.activate("rev-26", "reviewer")).rejects.toThrow(
        new ReferenceDataPersistenceError(
          "activate_reference_revision failed: reference revision rev-26 is active, not pending_review",
        ),
      );
    });
  });
});
