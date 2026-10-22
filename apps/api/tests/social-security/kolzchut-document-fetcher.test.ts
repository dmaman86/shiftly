import { describe, expect, it } from "vitest";
import { RulesPipelineError } from "../../src/shared/errors.ts";
import { KolZchutDocumentFetcher } from "../../src/social-security/kolzchut-document-fetcher.ts";
import { KOL_ZCHUT_ARTICLE_URL } from "../../src/social-security/contributions-research.ts";
import { fakeKolZchutSource, NOW } from "./kolzchut-fixtures.ts";

const failing = (error: RulesPipelineError) => ({
  employeeContributionsAt: async () => {
    throw error;
  },
});

describe("KolZchutDocumentFetcher", () => {
  it("serves the section as it read on the day, from the article's revision", async () => {
    const document = await new KolZchutDocumentFetcher(
      fakeKolZchutSource(),
      new Date("2020-06-30T12:00:00.000Z"),
      () => NOW,
    ).fetch(KOL_ZCHUT_ARTICLE_URL);

    expect(document).toMatchObject({
      requestedUrl: KOL_ZCHUT_ARTICLE_URL,
      httpStatus: 200,
      accessibility: "accessible",
      publisher: "www.kolzchut.org.il",
      format: "plain-text",
      retrievedAt: NOW.toISOString(),
    });
    expect(document.finalUrl).toContain("oldid=390155");
    expect(document.title).toContain("as of 2020-06-30");
    expect(document.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(document.text).toContain("6,331");
  });

  it.each([401, 403, 429])("reports HTTP %d as blocked", async (status) => {
    const document = await new KolZchutDocumentFetcher(
      failing(
        new RulesPipelineError(
          "source_unavailable",
          `answered HTTP ${status}`,
          {
            status,
          },
        ),
      ),
      new Date("2020-06-30T12:00:00.000Z"),
    ).fetch(KOL_ZCHUT_ARTICLE_URL);
    expect(document).toMatchObject({
      accessibility: "blocked",
      httpStatus: status,
      text: "",
      sha256: null,
    });
  });

  it("reports a date before the article as not found", async () => {
    const document = await new KolZchutDocumentFetcher(
      failing(new RulesPipelineError("year_not_covered", "no revision yet")),
      new Date("2016-12-31T12:00:00.000Z"),
    ).fetch(KOL_ZCHUT_ARTICLE_URL);
    expect(document.accessibility).toBe("not_found");
  });
});
