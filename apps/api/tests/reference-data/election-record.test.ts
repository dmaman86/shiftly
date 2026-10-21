import { describe, expect, it, vi } from "vitest";
import {
  israelDate,
  planElectionRecord,
  type ElectionRecordRequest,
} from "../../src/reference-data/election-record.ts";
import type { ActiveRevision } from "../../src/reference-data/ports.ts";
import type {
  Accessibility,
  FetchedDocument,
} from "../../src/research/ports.ts";

const OFFICIAL = "https://www.bechirot.gov.il/results/knesset26";
const SHA = "a".repeat(64);
const PAGE_TEXT =
  "Results of the elections to the 26th Knesset, held on 27 October 2026, are final.";
const QUOTE = "elections to the 26th Knesset, held on 27 October 2026";

const REQUEST: ElectionRecordRequest = {
  knessetNumber: 26,
  date: "2026-10-27",
  status: "occurred",
  sourceUrl: OFFICIAL,
  quote: QUOTE,
  manualNote: null,
};

const PLANNED_26: ActiveRevision = {
  id: "rev-planned",
  kind: "calendar.knesset_election",
  subjectKey: "knesset:26",
  validFrom: "2026-10-27",
  validTo: "2026-10-28",
  value: { knessetNumber: 26, electionStatus: "planned" },
  trust: "legacy_seed",
};

function document(
  accessibility: Accessibility,
  overrides: Partial<FetchedDocument> = {},
): FetchedDocument {
  const accessible = accessibility === "accessible";
  return {
    requestedUrl: OFFICIAL,
    finalUrl: OFFICIAL,
    httpStatus: accessible ? 200 : 403,
    contentType: accessible ? "text/html" : null,
    publisher: "www.bechirot.gov.il",
    title: accessible ? "Knesset 26 results" : null,
    retrievedAt: "2026-10-28T08:00:00.000Z",
    sha256: accessible ? SHA : null,
    accessibility,
    problem: accessible ? null : "HTTP 403",
    format: accessible ? "html-text" : null,
    text: accessible ? PAGE_TEXT : "",
    bytes: null,
    ...overrides,
  };
}

function plan(
  request: Partial<ElectionRecordRequest>,
  options: {
    fetched?: FetchedDocument;
    active?: ActiveRevision | null;
    today?: string;
  } = {},
) {
  const fetch = vi.fn(async () => options.fetched ?? document("accessible"));
  const findActiveSubject = vi.fn(async () => options.active ?? null);
  const result = planElectionRecord(
    { ...REQUEST, ...request },
    {
      fetcher: { fetch },
      administration: { findActiveSubject },
      today: options.today ?? "2026-10-28",
    },
  );
  return { result, fetch, findActiveSubject };
}

describe("planElectionRecord", () => {
  describe("with an official source that confirms it", () => {
    it("is official_verified, quoting the source exactly", async () => {
      const { result, findActiveSubject } = plan({}, { active: PLANNED_26 });
      const outcome = await result;

      expect(outcome.status).toBe("ready");
      if (outcome.status !== "ready") return;
      expect(outcome.active).toBe(PLANNED_26);
      expect(findActiveSubject).toHaveBeenCalledWith(
        "calendar.knesset_election",
        "knesset:26",
      );
      expect(outcome.candidate).toMatchObject({
        kind: "calendar.knesset_election",
        subjectKey: "knesset:26",
        validFrom: "2026-10-27",
        validTo: "2026-10-28",
        value: { knessetNumber: 26, electionStatus: "occurred" },
        origin: "manual",
        trust: "official_verified",
        fallbackReason: null,
      });
      expect(outcome.candidate.sources).toEqual([
        expect.objectContaining({
          url: OFFICIAL,
          tier: 1,
          discoveredVia: "manual",
          accessStatus: "fetched",
          sha256: SHA,
          httpStatus: 200,
          fetchAttemptedAt: "2026-10-28T08:00:00.000Z",
          role: "supporting",
        }),
      ]);
      expect(outcome.candidate.evidence).toEqual([
        expect.objectContaining({
          evidenceType: "fetched_verified",
          source: 0,
          quote: QUOTE,
          effectiveFrom: "2026-10-27",
          note: null,
        }),
      ]);
      expect(outcome.source.matchedQuote).toBe(QUOTE);
    });

    it("accepts a Wayback snapshot of an official page (tier 2)", async () => {
      const archived = `https://web.archive.org/web/20261028000000/${OFFICIAL}`;
      const outcome = await plan(
        { sourceUrl: archived },
        {
          fetched: document("accessible", {
            requestedUrl: archived,
            finalUrl: archived,
          }),
        },
      ).result;

      expect(outcome.status === "ready" && outcome.candidate.trust).toBe(
        "official_verified",
      );
      expect(outcome.source?.tier).toBe(2);
    });

    it("stores nothing new when the active revision already says it", async () => {
      const active: ActiveRevision = {
        ...PLANNED_26,
        value: { electionStatus: "occurred", knessetNumber: 26 },
        trust: "official_verified",
      };

      const outcome = await plan({}, { active }).result;

      expect(outcome).toMatchObject({ status: "unchanged", active });
    });
  });

  describe("without verification", () => {
    it("rejects a blocked official page unless recorded by hand", async () => {
      const outcome = await plan({}, { fetched: document("blocked") }).result;

      expect(outcome.status).toBe("rejected");
      expect(outcome.status === "rejected" && outcome.reason).toMatch(
        /blocked \(HTTP 403\).*manual note/,
      );
    });

    it("records a blocked official page as consulted, with the manual note", async () => {
      const outcome = await plan(
        {
          manualNote:
            "Official site blocks automated clients; checked by hand.",
        },
        { fetched: document("blocked") },
      ).result;

      expect(outcome.status).toBe("ready");
      if (outcome.status !== "ready") return;
      expect(outcome.candidate.trust).toBe("manual");
      expect(outcome.candidate.sources).toEqual([
        expect.objectContaining({
          accessStatus: "blocked",
          sha256: null,
          httpStatus: 403,
          role: "consulted",
        }),
      ]);
      expect(outcome.candidate.evidence).toEqual([
        expect.objectContaining({
          evidenceType: "manual",
          source: null,
          quote: null,
          note: "Official site blocks automated clients; checked by hand.",
        }),
      ]);
    });

    it("rejects a trusted secondary source even when the quote matches", async () => {
      const wikipedia = "https://he.wikipedia.org/wiki/elections";
      const outcome = await plan(
        { sourceUrl: wikipedia },
        {
          fetched: document("accessible", {
            requestedUrl: wikipedia,
            finalUrl: wikipedia,
          }),
        },
      ).result;

      expect(outcome.status === "rejected" && outcome.reason).toMatch(
        /not official \(tier 3\)/,
      );
    });

    it("rejects an official page that does not contain the quote", async () => {
      const outcome = await plan({
        quote: "elections to the 26th Knesset were postponed",
      }).result;

      expect(outcome.status === "rejected" && outcome.reason).toMatch(
        /quote was not found/,
      );
    });

    it("rejects an official page given without a quote", async () => {
      const outcome = await plan({ quote: null }).result;

      expect(outcome.status === "rejected" && outcome.reason).toMatch(
        /no quote was given/,
      );
    });

    it("counts a redirect off the official host as general web", async () => {
      const outcome = await plan(
        {},
        {
          fetched: document("accessible", {
            finalUrl: "https://elections-news.example/knesset26",
          }),
        },
      ).result;

      expect(outcome.status).toBe("rejected");
      expect(outcome.source?.tier).toBe(4);
    });

    it("never fetches general web; a manual record keeps it as not fetched", async () => {
      const { result, fetch } = plan({
        sourceUrl: "https://elections-news.example/knesset26",
        manualNote:
          "Reported by the press; official results not yet published.",
      });
      const outcome = await result;

      expect(fetch).not.toHaveBeenCalled();
      expect(outcome.status).toBe("ready");
      if (outcome.status !== "ready") return;
      expect(outcome.candidate.sources).toEqual([
        expect.objectContaining({
          tier: 4,
          accessStatus: "not_fetched",
          fetchAttemptedAt: null,
          role: "consulted",
        }),
      ]);
    });
  });

  describe("request checks, before any request", () => {
    it.each([
      ["on election day", "2026-10-27"],
      ["before election day", "2026-10-21"],
    ])("rejects 'occurred' %s", async (_, today) => {
      const { result, fetch } = plan({}, { today });

      expect(await result).toMatchObject({
        status: "rejected",
        reason: `an election on 2026-10-27 cannot be recorded as occurred on ${today}`,
      });
      expect(fetch).not.toHaveBeenCalled();
    });

    it("allows a future date for a planned election", async () => {
      const outcome = await plan({ status: "planned" }, { today: "2026-10-21" })
        .result;

      expect(outcome.status).toBe("ready");
    });

    it.each(["2026-02-30", "2026-13-01", "27/10/2026"])(
      "rejects the date %s",
      async (date) => {
        const outcome = await plan({ date }).result;

        expect(outcome).toMatchObject({
          status: "rejected",
          reason: `invalid date ${date}`,
        });
      },
    );

    it("rejects a Knesset number that is not a positive integer", async () => {
      const outcome = await plan({ knessetNumber: 0 }).result;

      expect(outcome.status).toBe("rejected");
    });

    it("rejects an empty manual note", async () => {
      const outcome = await plan({ manualNote: "  " }).result;

      expect(outcome).toMatchObject({
        status: "rejected",
        reason: "a manual note cannot be empty",
      });
    });
  });
});

describe("israelDate", () => {
  it("uses the Israeli calendar day, not the UTC one", () => {
    expect(israelDate(new Date("2026-10-27T22:30:00Z"))).toBe("2026-10-28");
    expect(israelDate(new Date("2026-10-27T21:30:00Z"))).toBe("2026-10-27");
  });
});
