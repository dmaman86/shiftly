import express, { type ErrorRequestHandler } from "express";
import { meHandler, requireAdmin, requireAuth } from "./middleware/auth.ts";
import type { AuthVerifier, RoleRepository } from "./ports/auth.ts";
import { corsAllowlist } from "./middleware/cors.ts";
import { handleBodyErrors, jsonBody } from "./middleware/json-body.ts";
import type { ReadinessCheck } from "./repositories/supabase-readiness.ts";
import { requestLog } from "./middleware/request-log.ts";
import type { IncomeTaxRulesResult } from "./research/income-tax/income-tax-pipeline.ts";
import type { IncomeTaxResearchResponse } from "./research/income-tax/income-tax-research.ts";
import type { PublishedElectionsReader } from "./services/published-elections.ts";
import { publishedElectionsRouter } from "./routes/published-elections-router.ts";
import type { PublishedTimelinesReader } from "./services/published-timelines.ts";
import { publishedTimelinesRouter } from "./routes/published-timelines-router.ts";
import { yearRulesRouter } from "./routes/rules-router.ts";
import { handleUserDataErrors } from "./errors/user-data-errors.ts";
import type { AccountDeleter } from "./repositories/account-deleter.ts";
import { accountRouter } from "./routes/account-router.ts";
import { guestImportRouter } from "./routes/guest-import-router.ts";
import { monthlyConfigRouter } from "./routes/monthly-config-router.ts";
import { shiftsRouter } from "./routes/shifts-router.ts";
import { workDaysRouter } from "./routes/work-days-router.ts";
import type { UserDataAccess } from "./repositories/user-scope.ts";

export type AppDeps = {
  /** Exact browser origins allowed by CORS. */
  readonly allowedOrigins: readonly string[];
  readonly readiness: ReadinessCheck;
  /** Public reference data: published elections only. */
  readonly publishedElections: PublishedElectionsReader;
  /** Public reference data: published rate timelines only. */
  readonly publishedTimelines: PublishedTimelinesReader;
  readonly auth: {
    readonly verifier: AuthVerifier;
    readonly roles: RoleRepository;
  };
  /**
   * User-owned data through a backend-only client, scoped to the verified
   * caller of each request.
   */
  readonly userData: UserDataAccess;
  /** Deletes the verified caller's account; never anyone else's. */
  readonly accounts: AccountDeleter;
  readonly extractIncomeTaxRules: (
    year: number,
  ) => Promise<IncomeTaxRulesResult>;
  /** Search-assisted research; stores validated values as pending review, never activates them. */
  readonly researchIncomeTax: (
    year: number,
  ) => Promise<IncomeTaxResearchResponse>;
};

export function createApp(deps: AppDeps): express.Express {
  const app = express();
  app.disable("x-powered-by");
  // Behind exactly one proxy (the platform's load balancer), so req.ip and
  // req.protocol describe the real client.
  app.set("trust proxy", 1);
  app.use(requestLog(), corsAllowlist(deps.allowedOrigins), jsonBody());

  // Liveness: the process is up. Never checks dependencies.
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Readiness: Supabase is reachable, so authenticated requests can work.
  app.get("/ready", async (_req, res) => {
    const ready = await deps.readiness.isReady();
    res
      .status(ready ? 200 : 503)
      .json({ status: ready ? "ready" : "unavailable" });
  });

  // Public: no token. Guests need election days and rates as much as
  // signed-in users.
  app.use(
    "/reference",
    publishedElectionsRouter(deps.publishedElections),
    publishedTimelinesRouter(deps.publishedTimelines),
  );

  const { verifier, roles } = deps.auth;

  // Any authenticated user: their own effective roles, for UI visibility.
  app.get("/me", requireAuth(verifier), meHandler(roles));

  // The caller's own data. Private: never cached, by the browser or a proxy,
  // whatever the outcome.
  app.use(
    "/me",
    (_req, res, next) => {
      res.set("Cache-Control", "no-store");
      next();
    },
    requireAuth(verifier),
    monthlyConfigRouter(deps.userData),
    workDaysRouter(deps.userData),
    shiftsRouter(deps.userData),
    guestImportRouter(deps.userData),
    accountRouter(deps.auth.verifier, deps.accounts),
  );

  // Admin only. Extraction and research read public sources, call a paid
  // model and write reference data, so every /admin route needs a verified
  // admin whose role and session are checked on each request.
  app.use(
    "/admin",
    requireAuth(verifier),
    requireAdmin(verifier, roles),
    yearRulesRouter("/income-tax", deps.extractIncomeTaxRules),
    yearRulesRouter("/income-tax", deps.researchIncomeTax, "research"),
  );

  app.use((_req, res) => {
    res
      .status(404)
      .json({ error: { code: "not_found", message: "Route not found" } });
  });
  app.use(handleBodyErrors, handleUserDataErrors, handleUnexpectedError);
  return app;
}

const handleUnexpectedError: ErrorRequestHandler = (
  error,
  _req,
  res,
  // Express recognises error handlers by their four-parameter arity.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next,
) => {
  console.error(
    JSON.stringify({
      severity: "ERROR",
      event: "unhandled_error",
      message: String(error?.message ?? error),
    }),
  );
  res
    .status(500)
    .json({ error: { code: "internal_error", message: "Unexpected error" } });
};
