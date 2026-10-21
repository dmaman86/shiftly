import { describe, expect, it } from "vitest";
import { byTier, sourceTier } from "../../src/research/source-policy.ts";

describe("sourceTier", () => {
  it.each([
    ["https://www.gov.il/BlobFolder/x.pdf", 1],
    ["https://taxes.gov.il/x", 1],
    ["https://web.archive.org/web/20250101000000/https://www.gov.il/x.pdf", 2],
    ["https://web.archive.org/web/20250101000000id_/https://www.gov.il/x", 2],
    ["https://web.archive.org/web/20250101000000/https://example.com/x", 4],
    ["https://www.kolzchut.org.il/he/x", 3],
    ["https://he.wikipedia.org/wiki/x", 3],
    ["https://www.shuma-atzmit.co.il/articles/x", 4],
    ["https://gov.il.example.com/x", 4],
    ["https://notgov.il/x", 4],
    ["http://www.gov.il/x", 4],
    ["not a url", 4],
  ])("%s is tier %i", (url, tier) => {
    expect(sourceTier(url)).toBe(tier);
  });

  it("orders by tier and keeps discovery order within a tier", () => {
    const sources = [
      { url: "a", tier: 3 as const },
      { url: "b", tier: 1 as const },
      { url: "c", tier: 3 as const },
      { url: "d", tier: 1 as const },
    ];
    expect(byTier(sources).map((source) => source.url)).toEqual([
      "b",
      "d",
      "a",
      "c",
    ]);
  });
});
