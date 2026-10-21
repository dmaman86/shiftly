import { describe, expect, it } from "vitest";
import {
  MediaWikiClient,
  type MediaWikiSite,
} from "../../src/shared/mediawiki-client.ts";
import { fakeMediaWikiFetch } from "./fake-mediawiki.ts";

const SITE: MediaWikiSite = {
  apiUrl: "https://wiki.example/w/api.php",
  indexUrl: "https://wiki.example/w/index.php",
  license: "CC-BY-SA-4.0",
};
const NOW = new Date("2026-10-18T00:00:00.000Z");

const client = new MediaWikiClient(SITE, {
  fetch: fakeMediaWikiFetch({
    Page: [
      { revid: 1, timestamp: "2020-01-10T00:00:00Z", wikitext: "first" },
      { revid: 2, timestamp: "2021-01-10T00:00:00Z", wikitext: "second" },
    ],
  }),
  now: () => NOW,
});

describe("MediaWikiClient", () => {
  it("returns the latest revision with a permanent link to it", async () => {
    expect(await client.revisionAt("Page")).toEqual({
      title: "Page",
      revisionId: 2,
      timestamp: "2021-01-10T00:00:00Z",
      wikitext: "second",
      ref: {
        url: "https://wiki.example/w/index.php?oldid=2",
        title: "Page",
        revisionId: 2,
        license: "CC-BY-SA-4.0",
        retrievedAt: NOW.toISOString(),
      },
    });
  });

  it("returns the revision in effect at a date", async () => {
    const revision = await client.revisionAt(
      "Page",
      new Date("2020-07-01T00:00:00Z"),
    );
    expect(revision.wikitext).toBe("first");
  });

  it("reports a date before the first revision as a year not covered", async () => {
    await expect(
      client.revisionAt("Page", new Date("2019-07-01T00:00:00Z")),
    ).rejects.toMatchObject({ code: "year_not_covered" });
  });

  it("reports a missing page as a source change", async () => {
    await expect(client.revisionAt("Other")).rejects.toMatchObject({
      code: "source_format_changed",
      details: { title: "Other", missing: true },
    });
  });

  it("reports HTTP and network failures as an unavailable source", async () => {
    const httpError = new MediaWikiClient(SITE, {
      fetch: (async () => new Response("", { status: 503 })) as typeof fetch,
    });
    await expect(httpError.revisionAt("Page")).rejects.toMatchObject({
      code: "source_unavailable",
      details: { status: 503 },
    });

    const offline = new MediaWikiClient(SITE, {
      fetch: (async () => {
        throw new TypeError("fetch failed");
      }) as typeof fetch,
    });
    await expect(offline.revisionAt("Page")).rejects.toMatchObject({
      code: "source_unavailable",
    });
  });
});
