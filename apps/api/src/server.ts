import { createApp } from "./app.ts";
import { SupabaseAuthVerifier } from "./repositories/supabase-auth-verifier.ts";
import { SupabaseRoleRepository } from "./repositories/supabase-role-repository.ts";
import { loadEnv } from "./config/env.ts";
import { loadLocalEnvFiles } from "./config/local-env.ts";
import { CachedPublishedElectionsReader } from "./repositories/cached-published-elections-reader.ts";
import { SupabasePublishedElectionsReader } from "./repositories/supabase-published-elections-reader.ts";
import { CachedPublishedTimelinesReader } from "./repositories/cached-published-timelines-reader.ts";
import { SupabasePublishedTimelinesReader } from "./repositories/supabase-published-timelines-reader.ts";
import { SupabaseReadinessCheck } from "./repositories/supabase-readiness.ts";
import { supabaseUserDataAccess } from "./repositories/user-scope.ts";
import { supabaseAccountDeleter } from "./repositories/account-deleter.ts";

loadLocalEnvFiles();

const env = loadEnv();

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
  // Auth admin: the main secret key, like the roles repository.
  accounts: supabaseAccountDeleter({
    url: env.SUPABASE_URL,
    secretKey: env.SUPABASE_SECRET_KEY,
  }),
  userData: supabaseUserDataAccess({
    url: env.SUPABASE_URL,
    secretKey: env.SUPABASE_USER_DATA_SECRET_KEY ?? env.SUPABASE_SECRET_KEY,
  }),
});

const server = app.listen(env.PORT, env.HOST, () => {
  console.log(
    JSON.stringify({
      severity: "INFO",
      event: "api_started",
      host: env.HOST,
      port: env.PORT,
      allowedOrigins: env.CORS_ALLOWED_ORIGINS,
      researchConfiguration: "administrative_cli_only",
      // Which key user data uses, never its value.
      userDataKey: env.SUPABASE_USER_DATA_SECRET_KEY ? "dedicated" : "shared",
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
