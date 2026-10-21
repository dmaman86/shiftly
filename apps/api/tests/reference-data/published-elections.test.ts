import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { SYSTEM_START_YEAR } from "@shiftly/domain";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CachedPublishedElectionsReader } from "../../src/reference-data/cached-published-elections-reader.ts";
import { ReferenceDataPersistenceError } from "../../src/reference-data/ports.ts";
import {
  FIRST_SUPPORTED_YEAR,
  supportedYears,
  type PublishedElection,
  type PublishedElectionsReader,
} from "../../src/reference-data/published-elections.ts";
import { publishedElectionsRouter } from "../../src/reference-data/published-elections-router.ts";
import {
  SupabasePublishedElectionsReader,
  toPublishedElections,
} from "../../src/reference-data/supabase-published-elections-reader.ts";
import express from "express";

const ELECTION_26: PublishedElection = {
  knessetNumber: 26,
  date: "2026-10-27",
  status: "planned",
};

const row = (
  validFrom: string,
  knessetNumber: number,
  electionStatus: string,
) => ({
  valid_from: validFrom,
  value: { knessetNumber, electionStatus },
});

describe("supported years", () => {
  it("start where the application starts calculating", () => {
    expect(FIRST_SUPPORTED_YEAR).toBe(SYSTEM_START_YEAR);
  });

  it("end one year after the current one, for December ranges", () => {
    expect(supportedYears(new Date("2026-10-21T12:00:00Z"))).toEqual({
      first: SYSTEM_START_YEAR,
      last: 2027,
    });
  });
});

describe("toPublishedElections", () => {
  it("maps rows to the public DTO only", () => {
    expect(
      toPublishedElections([
        row("2022-11-01", 25, "occurred"),
        row("2026-10-27", 26, "planned"),
        row("2026-12-01", 27, "confirmed"),
      ]),
    ).toEqual([
      { knessetNumber: 25, date: "2022-11-01", status: "occurred" },
      ELECTION_26,
      { knessetNumber: 27, date: "2026-12-01", status: "confirmed" },
    ]);
  });

  it("never publishes a cancelled election", () => {
    expect(
      toPublishedElections([
        row("2026-03-01", 26, "cancelled"),
        row("2026-10-27", 26, "planned"),
      ]),
    ).toEqual([ELECTION_26]);
  });

  it("refuses to publish a malformed active revision", () => {
    for (const rows of [
      [row("2026-10-27", 0, "planned")],
      [row("2026-10-27", 26, "rescheduled")],
      [
        {
          valid_from: "27/10/2026",
          value: { knessetNumber: 26, electionStatus: "planned" },
        },
      ],
      [{ valid_from: "2026-10-27", value: null }],
    ]) {
      expect(() => toPublishedElections(rows)).toThrow(
        ReferenceDataPersistenceError,
      );
    }
  });
});

describe("SupabasePublishedElectionsReader", () => {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });

  function readerWith(response: Response) {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => response.clone());
    const reader = new SupabasePublishedElectionsReader({
      url: "https://project.supabase.co",
      secretKey: "sb_secret_test",
      fetch,
    });
    const sent = () => {
      const [input, init] = fetch.mock.calls[0];
      return {
        url: new URL(String(input)),
        headers: new Headers(init?.headers),
      };
    };
    return { reader, sent };
  }

  it("reads only active elections starting in the year, period and value only", async () => {
    const { reader, sent } = readerWith(
      json([row("2026-10-27", 26, "planned")]),
    );

    expect(await reader.electionsIn(2026)).toEqual([ELECTION_26]);

    const { url, headers } = sent();
    expect(url.pathname).toBe("/rest/v1/reference_revisions");
    expect(url.searchParams.get("select")).toBe("valid_from,value");
    expect(url.searchParams.get("kind")).toBe("eq.calendar.knesset_election");
    expect(url.searchParams.get("status")).toBe("eq.active");
    expect(url.searchParams.getAll("valid_from")).toEqual([
      "gte.2026-01-01",
      "lt.2027-01-01",
    ]);
    expect(url.searchParams.get("order")).toBe("valid_from.asc");
    expect(headers.get("apikey")).toBe("sb_secret_test");
  });

  it("reports a store error as a persistence error", async () => {
    const { reader } = readerWith(
      json({ code: "42501", message: "permission denied" }, 403),
    );
    await expect(reader.electionsIn(2026)).rejects.toThrow(
      ReferenceDataPersistenceError,
    );
  });
});

describe("CachedPublishedElectionsReader", () => {
  function setup() {
    let now = 0;
    const inner = { electionsIn: vi.fn(async () => [ELECTION_26]) };
    const cached = new CachedPublishedElectionsReader(inner, {
      ttlMs: 1000,
      now: () => now,
    });
    return { inner, cached, advance: (ms: number) => (now += ms) };
  }

  it("serves a year from memory until it expires", async () => {
    const { inner, cached, advance } = setup();
    await cached.electionsIn(2026);
    advance(999);
    await cached.electionsIn(2026);
    expect(inner.electionsIn).toHaveBeenCalledTimes(1);

    advance(1);
    await cached.electionsIn(2026);
    expect(inner.electionsIn).toHaveBeenCalledTimes(2);
  });

  it("caches each year separately", async () => {
    const { inner, cached } = setup();
    await cached.electionsIn(2026);
    await cached.electionsIn(2022);
    expect(inner.electionsIn.mock.calls).toEqual([[2026], [2022]]);
  });

  it("shares one read between concurrent misses", async () => {
    const { inner, cached } = setup();
    await Promise.all([cached.electionsIn(2026), cached.electionsIn(2026)]);
    expect(inner.electionsIn).toHaveBeenCalledTimes(1);
  });

  it("does not cache a failed read", async () => {
    const { inner, cached } = setup();
    inner.electionsIn.mockRejectedValueOnce(
      new ReferenceDataPersistenceError("down"),
    );
    await expect(cached.electionsIn(2026)).rejects.toThrow("down");
    expect(await cached.electionsIn(2026)).toEqual([ELECTION_26]);
    expect(inner.electionsIn).toHaveBeenCalledTimes(2);
  });
});

describe("GET /reference/elections", () => {
  let server: Server | undefined;

  afterEach(() => {
    server?.close();
    server = undefined;
    vi.restoreAllMocks();
  });

  async function start(reader: PublishedElectionsReader) {
    const app = express();
    app.use(
      "/reference",
      publishedElectionsRouter(reader, () => new Date("2026-10-21T12:00:00Z")),
    );
    server = app.listen(0, "127.0.0.1");
    await new Promise((resolve) => server!.once("listening", resolve));
    const { port } = server.address() as AddressInfo;
    return (path: string) => fetch(`http://127.0.0.1:${port}${path}`);
  }

  it("publishes the year's elections without a token, cacheable for five minutes", async () => {
    const request = await start({ electionsIn: async () => [ELECTION_26] });
    const response = await request("/reference/elections?year=2026");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe(
      "public, max-age=300, stale-while-revalidate=3600",
    );
    expect(await response.json()).toEqual({
      year: 2026,
      elections: [ELECTION_26],
    });
  });

  it("answers a year without elections with an empty list, not an error", async () => {
    const request = await start({ electionsIn: async () => [] });
    const response = await request("/reference/elections?year=2024");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ year: 2024, elections: [] });
  });

  it.each([
    ["missing", ""],
    ["before the system start", "?year=2014"],
    ["after next year", "?year=2028"],
    ["not a plain year", "?year=2026.0"],
    ["repeated", "?year=2026&year=2027"],
  ])("rejects a %s year with 400", async (_label, query) => {
    const reader = { electionsIn: vi.fn(async () => []) };
    const request = await start(reader);
    const response = await request(`/reference/elections${query}`);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: { code: "invalid_year", message: "Year must be 2015–2027" },
    });
    expect(reader.electionsIn).not.toHaveBeenCalled();
  });

  it("accepts next year, which a December range reaches", async () => {
    const request = await start({ electionsIn: async () => [] });
    expect((await request("/reference/elections?year=2027")).status).toBe(200);
  });

  it("answers 503 without caching when the store is unavailable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const request = await start({
      electionsIn: async () => {
        throw new ReferenceDataPersistenceError("down");
      },
    });
    const response = await request("/reference/elections?year=2026");
    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      error: {
        code: "reference_data_unavailable",
        message: "Reference data is temporarily unavailable",
      },
    });
  });
});
