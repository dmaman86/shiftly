import express, { type ErrorRequestHandler } from "express";
import { meHandler, requireAdmin, requireAuth } from "./auth/middleware.ts";
import type { AuthVerifier, RoleRepository } from "./auth/ports.ts";
import { corsAllowlist } from "./http/cors.ts";
import { handleBodyErrors, jsonBody } from "./http/json-body.ts";
import type { ReadinessCheck } from "./http/readiness.ts";
import { requestLog } from "./http/request-log.ts";
import type { IncomeTaxRulesResult } from "./income-tax/income-tax-pipeline.ts";
import type { IncomeTaxResearchResponse } from "./income-tax/income-tax-research.ts";
import type { PublishedElectionsReader } from "./reference-data/published-elections.ts";
import { publishedElectionsRouter } from "./reference-data/published-elections-router.ts";
import { yearRulesRouter } from "./shared/rules-router.ts";
import type { SocialSecurityRulesResult } from "./social-security/social-security-pipeline.ts";

export type AppDeps = {
  /** Exact browser origins allowed by CORS. */
  readonly allowedOrigins: readonly string[];
  readonly readiness: ReadinessCheck;
  /** Public reference data: published elections only. */
  readonly publishedElections: PublishedElectionsReader;
  readonly auth: {
    readonly verifier: AuthVerifier;
    readonly roles: RoleRepository;
  };
  readonly extractIncomeTaxRules: (
    year: number,
  ) => Promise<IncomeTaxRulesResult>;
  readonly extractSocialSecurityRules: (
    year: number,
  ) => Promise<SocialSecurityRulesResult>;
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

  // Public: no token. Guests need election days as much as signed-in users.
  app.use("/reference", publishedElectionsRouter(deps.publishedElections));

  const { verifier, roles } = deps.auth;

  // Any authenticated user: their own effective roles, for UI visibility.
  app.get("/me", requireAuth(verifier), meHandler(roles));

  // Admin only. Extraction and research read public sources, call a paid
  // model and write reference data, so every /admin route needs a verified
  // admin whose role and session are checked on each request.
  app.use(
    "/admin",
    requireAuth(verifier),
    requireAdmin(verifier, roles),
    yearRulesRouter("/income-tax", deps.extractIncomeTaxRules),
    yearRulesRouter("/social-security", deps.extractSocialSecurityRules),
    yearRulesRouter("/income-tax", deps.researchIncomeTax, "research"),
  );

  app.use((_req, res) => {
    res
      .status(404)
      .json({ error: { code: "not_found", message: "Route not found" } });
  });
  app.use(handleBodyErrors, handleUnexpectedError);
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
