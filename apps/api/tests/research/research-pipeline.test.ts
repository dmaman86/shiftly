import { describe, expect, it, vi } from "vitest";
import { INCOME_TAX_RESEARCH } from "../../src/income-tax/income-tax-research.ts";
import type {
  DiscoveredSource,
  FetchedDocument,
  ResearchDiscoveryResult,
} from "../../src/research/ports.ts";
import {
  MAX_EXTRACTIONS,
  researchReferenceData,
} from "../../src/research/research-pipeline.ts";
import type { DebugArtifactStore } from "../../src/shared/debug-artifacts.ts";
import { RulesPipelineError } from "../../src/shared/errors.ts";
import type { ExtractionResult } from "../../src/shared/gemma-extractor.ts";
import {
  ANSWER_2026,
  BOOKLET_2026_TEXT,
  BOOKLET_URL,
  fetchedDocument,
} from "./booklet-fixtures.ts";

const GOV_PAGE = "https://www.gov.il/he/pages/income-tax-monthly-deductions";
const KOL_ZCHUT = "https://www.kolzchut.org.il/he/מדרגות_מס_הכנסה";
const BLOG = "https://www.shuma-atzmit.co.il/articles/2026";

const COVER_PAGE = "[page 1]\nלוח ניכויים חודשי\n";
const PDF_TEXT = `${COVER_PAGE}${BOOKLET_2026_TEXT}`;

const accessible = (url: string, patch: Partial<FetchedDocument> = {}) =>
  fetchedDocument({
    requestedUrl: url,
    finalUrl: url,
    publisher: new URL(url).hostname,
    text: PDF_TEXT,
    bytes: new Uint8Array([37, 80, 68, 70]),
    ...patch,
  });
const unavailable = (
  url: string,
  accessibility: FetchedDocument["accessibility"],
  httpStatus: number | null,
) =>
  fetchedDocument({
    requestedUrl: url,
    finalUrl: url,
    httpStatus,
    accessibility,
    problem: `HTTP ${httpStatus}`,
    sha256: null,
    format: null,
    text: "",
  });

/** Kol Zchut serves HTML: the same rows, no page markers. */
const KOL_ZCHUT_PAGE = accessible(KOL_ZCHUT, {
  format: "html-text",
  contentType: "text/html",
  text: BOOKLET_2026_TEXT.replace(/\[page \d+\]\n/g, ""),
});

const discovered = (...urls: string[]): ResearchDiscoveryResult => ({
  sources: urls.map((url): DiscoveredSource => ({
    url,
    title: null,
    origin: "grounding_metadata",
  })),
  searchQueries: ["לוח ניכויים חודשי 2026"],
  call: {
    model: "gemma-4-31b-it",
    startedAt: "2026-10-20T12:00:00.000Z",
    durationMs: 99_000,
    outcome: "response",
    httpStatus: null,
    error: null,
  },
  rawText: "The booklet says 242.",
});

const extracted = (raw: unknown = ANSWER_2026): ExtractionResult => ({
  raw,
  trace: {
    model: "gemma-4-31b-it",
    task: "income_tax_research",
    attempts: [],
    rawText: JSON.stringify(raw),
  },
});

function setup(options: {
  documents: Record<string, FetchedDocument>;
  discovery?: ResearchDiscoveryResult;
  extract?: (document: FetchedDocument) => Promise<ExtractionResult>;
}) {
  const written = new Map<string, string | Uint8Array>();
  const artifacts: DebugArtifactStore = {
    forDocument: async (year, key) => ({
      write: async (name, content) => {
        written.set(`${year}/${key}/${name}`, content);
      },
    }),
  };
  const discover = vi.fn(async () => options.discovery ?? discovered());
  const fetch = vi.fn(async (url: string) => {
    const document = options.documents[url];
    if (!document) throw new Error(`unexpected fetch of ${url}`);
    return document;
  });
  const extract = vi.fn(
    async (_task: unknown, document: FetchedDocument) =>
      options.extract?.(document) ?? extracted(),
  );
  const run = (year = 2026) =>
    researchReferenceData(year, INCOME_TAX_RESEARCH, {
      research: { discover },
      fetcher: { fetch },
      extraction: { extract },
      artifacts,
    });
  return { run, discover, fetch, extract, written };
}

describe("researchReferenceData (income tax)", () => {
  it("validates the official booklet without searching", async () => {
    const { run, discover, extract, written } = setup({
      documents: { [BOOKLET_URL]: accessible(BOOKLET_URL) },
    });

    const result = await run();

    expect(discover).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: "validated",
      candidate: {
        trust: "official",
        source: { finalUrl: BOOKLET_URL, tier: 1, sha256: "a".repeat(64) },
        values: {
          monthlyCreditPoint: { value: 242, page: 12 },
          monthlyBrackets: { page: 10 },
        },
      },
      provenance: {
        officialSourceFound: true,
        officialSourceAccessible: true,
        fallbackReason: null,
        discovery: { status: "not_needed" },
      },
      attempts: [{ origin: "known", tier: 1, outcome: "validated" }],
    });
    // Only the pages that mention brackets or the credit point reach the model.
    const [, input] = extract.mock.calls[0];
    expect(input.text).toBe(BOOKLET_2026_TEXT);
    expect(written.get("2026/research/source-1.raw.pdf")).toBeInstanceOf(
      Uint8Array,
    );
    expect(written.has("2026/research/result.json")).toBe(true);
  });

  it("falls back to a trusted secondary source when the official one is blocked", async () => {
    const { run, fetch } = setup({
      documents: {
        [BOOKLET_URL]: unavailable(BOOKLET_URL, "blocked", 403),
        [GOV_PAGE]: unavailable(GOV_PAGE, "blocked", 403),
        [KOL_ZCHUT]: KOL_ZCHUT_PAGE,
      },
      // Discovery order is not trust order: the blog is never fetched.
      discovery: discovered(BLOG, KOL_ZCHUT, GOV_PAGE, BOOKLET_URL),
    });

    const result = await run();

    expect(fetch.mock.calls.map(([url]) => url)).toEqual([
      BOOKLET_URL,
      GOV_PAGE,
      KOL_ZCHUT,
    ]);
    expect(result).toMatchObject({
      status: "validated",
      candidate: { trust: "trusted_secondary", source: { tier: 3 } },
      provenance: {
        officialSourceFound: true,
        officialSourceAccessible: false,
        fallbackReason: "official_source_blocked",
        discovery: { status: "succeeded", sourcesFound: 4 },
      },
    });
    expect(result.attempts.map((attempt) => attempt.outcome)).toEqual([
      "blocked",
      "blocked",
      "validated",
    ]);
  });

  it("never fetches or trusts general web sources", async () => {
    const { run, fetch, extract } = setup({
      documents: {},
      discovery: discovered(BLOG),
    });

    const result = await run(2021);

    expect(fetch).not.toHaveBeenCalled();
    expect(extract).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      status: "unresolved",
      candidate: null,
      provenance: {
        officialSourceFound: false,
        fallbackReason: "official_source_not_found",
      },
      attempts: [
        { origin: "discovery", tier: 4, outcome: "skipped_untrusted_tier" },
      ],
    });
  });

  it("does not trust a source that redirects to a general web page", async () => {
    const { run, extract } = setup({
      documents: {
        [KOL_ZCHUT]: { ...KOL_ZCHUT_PAGE, finalUrl: BLOG },
      },
      discovery: discovered(KOL_ZCHUT),
    });

    const result = await run(2021);

    expect(extract).not.toHaveBeenCalled();
    expect(result.attempts).toMatchObject([
      { tier: 4, outcome: "skipped_untrusted_tier", finalUrl: BLOG },
    ]);
  });

  it("keeps searching after the validator rejects the official extraction", async () => {
    const { run } = setup({
      documents: {
        [BOOKLET_URL]: accessible(BOOKLET_URL),
        [KOL_ZCHUT]: KOL_ZCHUT_PAGE,
      },
      discovery: discovered(KOL_ZCHUT),
      extract: async (document) =>
        document.finalUrl === BOOKLET_URL
          ? extracted({
              ...ANSWER_2026,
              monthlyCreditPoint: {
                ...ANSWER_2026.monthlyCreditPoint,
                value: 235,
              },
            })
          : extracted(),
    });

    const result = await run();

    expect(result.provenance.fallbackReason).toBe("official_source_rejected");
    expect(result.attempts).toMatchObject([
      {
        outcome: "invalid_extraction",
        problems: ["monthlyCreditPoint: 235 is not in its quote"],
      },
      { outcome: "validated", tier: 3 },
    ]);
  });

  it("tells a provider failure apart from a rejected source", async () => {
    const { run } = setup({
      documents: { [BOOKLET_URL]: accessible(BOOKLET_URL) },
      discovery: {
        ...discovered(),
        call: {
          ...discovered().call,
          outcome: "provider_error",
          httpStatus: 503,
        },
      },
      extract: async () => {
        throw new RulesPipelineError(
          "extraction_failed",
          "LLM request failed after 3 attempt(s)",
        );
      },
    });

    const result = await run();

    expect(result).toMatchObject({
      status: "unresolved",
      provenance: {
        officialSourceAccessible: true,
        fallbackReason: "official_extraction_failed",
        discovery: { status: "failed" },
      },
      attempts: [{ outcome: "extraction_failed" }],
    });
  });

  it("does not send a PDF without relevant pages to the model", async () => {
    const { run, extract } = setup({
      documents: {
        [BOOKLET_URL]: accessible(BOOKLET_URL, { text: COVER_PAGE }),
      },
    });

    const result = await run();

    expect(extract).not.toHaveBeenCalled();
    expect(result.attempts[0]).toMatchObject({
      outcome: "no_relevant_content",
    });
  });

  it(`stops after ${MAX_EXTRACTIONS} paid extractions`, async () => {
    const urls = [1, 2, 3, 4].map((n) => `https://www.gov.il/booklet-${n}.pdf`);
    const { run, extract } = setup({
      documents: Object.fromEntries(urls.map((url) => [url, accessible(url)])),
      discovery: discovered(...urls),
      extract: async () => extracted({ ...ANSWER_2026, status: "unclear" }),
    });

    const result = await run(2021);

    expect(extract).toHaveBeenCalledTimes(MAX_EXTRACTIONS);
    expect(result.attempts.map((attempt) => attempt.outcome)).toEqual([
      "extraction_unclear",
      "extraction_unclear",
      "extraction_unclear",
      "skipped_extraction_limit",
    ]);
  });

  it("does not fetch the same URL twice", async () => {
    const { run, fetch } = setup({
      documents: { [BOOKLET_URL]: unavailable(BOOKLET_URL, "not_found", 404) },
      discovery: discovered(BOOKLET_URL),
    });

    const result = await run();

    expect(fetch).toHaveBeenCalledTimes(1);
    // A 404 on the official pattern is not an official source found.
    expect(result.provenance).toMatchObject({
      officialSourceFound: false,
      fallbackReason: "official_source_not_found",
    });
  });
});
