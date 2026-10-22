import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadDotenv } from "dotenv";
import { createApp } from "./app.ts";
import { SupabaseAuthVerifier } from "./auth/supabase-auth-verifier.ts";
import { SupabaseRoleRepository } from "./auth/supabase-role-repository.ts";
import { loadEnv } from "./config/env.ts";
import { extractIncomeTaxRules } from "./income-tax/income-tax-pipeline.ts";
import { researchAndStoreIncomeTax } from "./income-tax/income-tax-research.ts";
import { CachedPublishedElectionsReader } from "./reference-data/cached-published-elections-reader.ts";
import { SupabasePublishedElectionsReader } from "./reference-data/supabase-published-elections-reader.ts";
import { CachedPublishedTimelinesReader } from "./reference-data/cached-published-timelines-reader.ts";
import { SupabasePublishedTimelinesReader } from "./reference-data/supabase-published-timelines-reader.ts";
import { SupabaseRevisionRepository } from "./reference-data/supabase-revision-repository.ts";
import { WikipediaIncomeTaxSource } from "./income-tax/wikipedia-source.ts";
import { GoogleGemmaExtractionProvider } from "./research/google-gemma-extraction-provider.ts";
import { GoogleGemmaResearchProvider } from "./research/google-gemma-research-provider.ts";
import { SupabaseReadinessCheck } from "./http/readiness.ts";
import { HttpDocumentFetcher } from "./research/http-document-fetcher.ts";
import { FileDebugArtifactStore } from "./shared/debug-artifacts.ts";
import { GemmaExtractor } from "./shared/gemma-extractor.ts";

// The first file that defines a variable wins, and shell variables are never
// overridden. Paths are resolved from this file, so the cwd does not matter.
loadDotenv({
  path: [
    fileURLToPath(new URL("../.env", import.meta.url)),
    fileURLToPath(new URL("../../../.env.local", import.meta.url)),
  ],
  quiet: true,
});

const env = loadEnv();

const extractor = new GemmaExtractor({
  apiKey: env.GEMINI_API_KEY,
  model: env.GEMINI_MODEL,
});

const incomeTaxDeps = {
  source: new WikipediaIncomeTaxSource(),
  extractor,
  artifacts: new FileDebugArtifactStore(join(env.ARTIFACTS_DIR, "income-tax")),
};

const researchDeps = {
  research: new GoogleGemmaResearchProvider({
    apiKey: env.GEMINI_API_KEY,
    model: env.GEMINI_MODEL,
  }),
  fetcher: new HttpDocumentFetcher(),
  extraction: new GoogleGemmaExtractionProvider(extractor),
  artifacts: new FileDebugArtifactStore(
    join(env.ARTIFACTS_DIR, "income-tax-research"),
  ),
  revisions: env.REFERENCE_DATA_PERSISTENCE_ENABLED
    ? new SupabaseRevisionRepository({
        url: env.SUPABASE_URL,
        secretKey: env.SUPABASE_SECRET_KEY,
      })
    : null,
};

const app = createApp({
  allowedOrigins: env.CORS_ALLOWED_ORIGINS,
  readiness: new SupabaseReadinessCheck({
    url: env.SUPABASE_URL,
    publishableKey: env.SUPABASE_PUBLISHABLE_KEY,
  }),
  publishedElections: new CachedPublishedElectionsReader(
    new SupabasePublishedElectionsReader({
      url: env.SUPABASE_URL,
      secretKey: env.SUPABASE_SECRET_KEY,
    }),
  ),
  publishedTimelines: new CachedPublishedTimelinesReader(
    new SupabasePublishedTimelinesReader({
      url: env.SUPABASE_URL,
      secretKey: env.SUPABASE_SECRET_KEY,
    }),
  ),
  auth: {
    verifier: new SupabaseAuthVerifier({
      url: env.SUPABASE_URL,
      publishableKey: env.SUPABASE_PUBLISHABLE_KEY,
    }),
    roles: new SupabaseRoleRepository({
      url: env.SUPABASE_URL,
      secretKey: env.SUPABASE_SECRET_KEY,
    }),
  },
  extractIncomeTaxRules: (year) => extractIncomeTaxRules(year, incomeTaxDeps),
  researchIncomeTax: (year) => researchAndStoreIncomeTax(year, researchDeps),
});

const server = app.listen(env.PORT, env.HOST, () => {
  console.log(
    JSON.stringify({
      severity: "INFO",
      event: "api_started",
      host: env.HOST,
      port: env.PORT,
      allowedOrigins: env.CORS_ALLOWED_ORIGINS,
      referenceDataPersistence: env.REFERENCE_DATA_PERSISTENCE_ENABLED,
    }),
  );
});

// The platform sends SIGTERM before stopping an instance: stop accepting
// connections and let in-flight requests finish.
for (const signal of ["SIGTERM", "SIGINT"] as const) {
  process.once(signal, () => {
    console.log(
      JSON.stringify({ severity: "INFO", event: "api_stopping", signal }),
    );
    server.close(() => process.exit(0));
    server.closeIdleConnections();
  });
}
