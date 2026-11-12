import { describe, expect, it, vi } from "vitest";
import { GoogleGroundedResearchProvider } from "../../../src/research/google-grounded-research-provider.ts";
import { SPEC, TASK, answerFor } from "./fixtures.ts";

describe("single-call Google grounded provider", () => {
  it("sends exact year/month/parameters and does not request unsupported schema mode", async () => {
    const generate = vi.fn(async () => answerFor());
    const provider = new GoogleGroundedResearchProvider({
      apiKey: "unused",
      model: "gemma-4-31b-it",
      generate,
    });
    await provider.research(TASK, SPEC);
    expect(generate).toHaveBeenCalledTimes(1);
    const [prompt, instructions] = generate.mock.calls[0] as unknown as [
      string,
      string,
    ];
    expect(JSON.parse(prompt)).toMatchObject({
      year: 2026,
      month: 2,
      parameters: ["income_tax.credit_point"],
    });
    expect(instructions).toContain("including all mid-month changes");
    expect(instructions).toContain("Never batch other months");
  });
  it.each([429, 500, 503])(
    "performs exactly one inference HTTP request for HTTP %s",
    async (status) => {
      const fetch = vi.fn<typeof globalThis.fetch>(
        async () =>
          new Response(
            JSON.stringify({
              error: {
                code: status,
                status: "UNAVAILABLE",
                message: "sensitive-provider-response",
              },
            }),
            { status, headers: { "content-type": "application/json" } },
          ),
      );
      const provider = new GoogleGroundedResearchProvider({
        apiKey: "synthetic-key",
        model: "gemma-4-31b-it",
        fetch,
      });
      await expect(provider.research(TASK, SPEC)).rejects.toThrow(
        "provider_error",
      );
      expect(fetch).toHaveBeenCalledTimes(1);
      const body = JSON.parse(String(fetch.mock.calls[0][1]?.body));
      expect(body.tools).toEqual([{ googleSearch: {} }]);
      expect(body.generationConfig.responseMimeType).toBeUndefined();
      expect(body.generationConfig.responseJsonSchema).toBeUndefined();
    },
  );
  it("does not retry a network failure or silently change models", async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(async () => {
      throw new TypeError("network failure");
    });
    const provider = new GoogleGroundedResearchProvider({
      apiKey: "synthetic-key",
      model: "gemma-4-31b-it",
      fetch,
    });
    await expect(provider.research(TASK, SPEC)).rejects.toThrow(
      "provider_error",
    );
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0][0])).toContain("gemma-4-31b-it");
  });
  it("only resolves provider grounding redirects, never model-proposed URLs", async () => {
    const uri =
      "https://vertexaisearch.cloud.google.com/grounding-api-redirect/synthetic";
    const answer = answerFor();
    const resolveRedirect = vi.fn(
      async () => "https://www.gov.il/synthetic-fixture",
    );
    const provider = new GoogleGroundedResearchProvider({
      apiKey: "unused",
      model: "gemma-4-31b-it",
      generate: async () => ({
        ...answer,
        chunks: [{ uri, title: "Synthetic", resolvedUri: null }],
      }),
      resolveRedirect,
    });
    const result = await provider.research(TASK, SPEC);
    expect(resolveRedirect).toHaveBeenCalledExactlyOnceWith(uri);
    expect(result.chunks[0].resolvedUri).toBe(
      "https://www.gov.il/synthetic-fixture",
    );
  });
});
