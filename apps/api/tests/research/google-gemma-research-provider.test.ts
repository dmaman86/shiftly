import { describe, expect, it, vi } from "vitest";
import {
  GoogleGemmaResearchProvider,
  type SearchAnswer,
} from "../../src/research/google-gemma-research-provider.ts";

const REDIRECT =
  "https://vertexaisearch.cloud.google.com/grounding-api-redirect/AUZIYQ";
const REQUEST = { subject: "the monthly deductions booklet", year: 2026 };

const answer = (patch: Partial<SearchAnswer> = {}): SearchAnswer => ({
  text: "The booklet states 242 per credit point.",
  links: [],
  queries: ["לוח ניכויים חודשי 2026"],
  ...patch,
});

const providerError = (status: number, message = `HTTP ${status}`) =>
  Object.assign(new Error(message), { status });

function providerWith(...outcomes: (SearchAnswer | Error)[]) {
  const generate = vi.fn(async () => {
    const next = outcomes.shift()!;
    if (next instanceof Error) throw next;
    return next;
  });
  const resolveRedirect = vi.fn(async (uri: string) =>
    uri === `${REDIRECT}1` ? "https://www.kolzchut.org.il/he/page" : null,
  );
  const sleep = vi.fn(async () => {});
  const provider = new GoogleGemmaResearchProvider({
    apiKey: "unused",
    model: "gemma-4-31b-it",
    generate,
    resolveRedirect,
    sleep,
  });
  return { provider, generate, resolveRedirect, sleep };
}

describe("GoogleGemmaResearchProvider", () => {
  it("takes URLs from the search metadata and resolves search redirects", async () => {
    const { provider, resolveRedirect } = providerWith(
      answer({
        text: "See https://example.com/ignored",
        links: [
          { uri: `${REDIRECT}1`, title: "kolzchut.org.il" },
          { uri: `${REDIRECT}2`, title: "unresolvable.example" },
          { uri: "https://www.gov.il/he/pages/x", title: null },
        ],
      }),
    );

    const result = await provider.discover(REQUEST);

    expect(result.sources).toEqual([
      {
        url: "https://www.kolzchut.org.il/he/page",
        title: "kolzchut.org.il",
        origin: "grounding_metadata",
      },
      {
        url: "https://www.gov.il/he/pages/x",
        title: null,
        origin: "grounding_metadata",
      },
    ]);
    expect(resolveRedirect).toHaveBeenCalledTimes(2);
    expect(result.searchQueries).toEqual(["לוח ניכויים חודשי 2026"]);
    expect(result.call).toMatchObject({ outcome: "response", error: null });
  });

  it("parses URLs from the answer text only when there is no metadata", async () => {
    const { provider } = providerWith(
      answer({
        text: "1. https://www.gov.il/a.pdf.\n2. (https://www.gov.il/b) and https://www.gov.il/a.pdf",
      }),
    );
    expect((await provider.discover(REQUEST)).sources).toEqual([
      { url: "https://www.gov.il/a.pdf", title: null, origin: "response_text" },
      { url: "https://www.gov.il/b", title: null, origin: "response_text" },
    ]);
  });

  it("asks for sources only, never for values", async () => {
    const { provider, generate } = providerWith(answer());
    await provider.discover(REQUEST);
    const [request] = generate.mock.calls[0] as unknown as [
      { prompt: string; systemInstruction: string },
    ];
    expect(request.prompt).toBe(
      "Find documents that state the monthly deductions booklet for 2026.",
    );
    expect(request.systemInstruction).toContain(
      "Do not state, summarise or guess any of the values",
    );
  });

  it("retries once after the provider's quota delay", async () => {
    const { provider, sleep, generate } = providerWith(
      providerError(429, "Quota exceeded. Please retry in 36.3s."),
      answer({ links: [{ uri: "https://www.gov.il/x", title: null }] }),
    );
    const result = await provider.discover(REQUEST);
    expect(sleep).toHaveBeenCalledWith(36_300);
    expect(generate).toHaveBeenCalledTimes(2);
    expect(result.sources).toHaveLength(1);
  });

  it("records a provider failure instead of throwing", async () => {
    const { provider, generate } = providerWith(
      providerError(500),
      providerError(503),
    );
    const result = await provider.discover(REQUEST);
    expect(generate).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      sources: [],
      call: { outcome: "provider_error", httpStatus: 503 },
    });
  });

  it("does not retry a request the provider rejects", async () => {
    const { provider, generate } = providerWith(providerError(400));
    const result = await provider.discover(REQUEST);
    expect(generate).toHaveBeenCalledTimes(1);
    expect(result.call.httpStatus).toBe(400);
  });
});
