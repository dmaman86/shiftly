import { describe, expect, it } from "vitest";
import { loadEnv, loadResearchEnv } from "../../../src/config/env.ts";
import { legacyResearch } from "../../../src/research/legacy-research.ts";

const CORE = {
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_PUBLISHABLE_KEY: "synthetic",
  SUPABASE_SECRET_KEY: "synthetic",
};

describe("research configuration isolation", () => {
  it("loads core API dependencies without Gemini settings or valid research flags", () => {
    expect(() => loadEnv(CORE)).not.toThrow();
    expect(() =>
      loadEnv({
        ...CORE,
        GEMINI_API_KEY: "",
        GEMINI_MODEL: "",
        REFERENCE_DATA_PERSISTENCE_ENABLED: "invalid",
      }),
    ).not.toThrow();
  });
  it("keeps unified execution and persistence disabled by default", () => {
    expect(loadResearchEnv({ GEMINI_API_KEY: "synthetic" })).toMatchObject({
      GEMINI_MODEL: "gemma-4-31b-it",
      REFERENCE_RESEARCH_ENABLED: false,
      REFERENCE_DATA_PERSISTENCE_ENABLED: false,
    });
  });
  it("constructs the HTTP composition without a research key and fails only when research is requested", async () => {
    const research = legacyResearch(loadEnv(CORE), {});
    await expect(research.researchIncomeTax(2026)).rejects.toMatchObject({
      code: "source_unavailable",
    });
    await expect(research.extractIncomeTaxRules(2026)).rejects.toMatchObject({
      code: "source_unavailable",
    });
  });
});
