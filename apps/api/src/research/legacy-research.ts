import { join } from "node:path";
import { loadResearchEnv, type Env } from "../config/env.ts";
import { SupabaseRevisionRepository } from "../repositories/supabase-revision-repository.ts";
import { extractIncomeTaxRules } from "./income-tax/income-tax-pipeline.ts";
import { researchAndStoreIncomeTax } from "./income-tax/income-tax-research.ts";
import { WikipediaIncomeTaxSource } from "./income-tax/wikipedia-source.ts";
import { GoogleGemmaExtractionProvider } from "./google-gemma-extraction-provider.ts";
import { GoogleGemmaResearchProvider } from "./google-gemma-research-provider.ts";
import { HttpDocumentFetcher } from "./http-document-fetcher.ts";
import { FileDebugArtifactStore } from "./shared/debug-artifacts.ts";
import { GemmaExtractor } from "./shared/gemma-extractor.ts";
import { RulesPipelineError } from "./shared/errors.ts";

/** Temporary composition until PR C removes the old endpoints. Never a fallback for unified research. */
export const legacyResearch = (
  env: Env,
  source: NodeJS.ProcessEnv = process.env,
) => {
  const dependencies = () => {
    let settings;
    try {
      settings = loadResearchEnv(source);
    } catch {
      throw new RulesPipelineError(
        "source_unavailable",
        "Research is not configured",
      );
    }
    const extractor = new GemmaExtractor({
      apiKey: settings.GEMINI_API_KEY,
      model: settings.GEMINI_MODEL,
    });
    return {
      incomeTax: {
        source: new WikipediaIncomeTaxSource(),
        extractor,
        artifacts: new FileDebugArtifactStore(
          join(env.ARTIFACTS_DIR, "income-tax"),
        ),
      },
      research: {
        research: new GoogleGemmaResearchProvider({
          apiKey: settings.GEMINI_API_KEY,
          model: settings.GEMINI_MODEL,
        }),
        fetcher: new HttpDocumentFetcher(),
        extraction: new GoogleGemmaExtractionProvider(extractor),
        artifacts: new FileDebugArtifactStore(
          join(env.ARTIFACTS_DIR, "income-tax-research"),
        ),
        revisions: settings.REFERENCE_DATA_PERSISTENCE_ENABLED
          ? new SupabaseRevisionRepository({
              url: env.SUPABASE_URL,
              secretKey: env.SUPABASE_SECRET_KEY,
            })
          : null,
      },
    };
  };
  return {
    extractIncomeTaxRules: async (year: number) =>
      extractIncomeTaxRules(year, dependencies().incomeTax),
    researchIncomeTax: async (year: number) =>
      researchAndStoreIncomeTax(year, dependencies().research),
  };
};
