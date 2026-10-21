import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, type AppDeps } from "../src/app.ts";
import { RulesPipelineError } from "../src/shared/errors.ts";
import { ADMIN_TOKEN, FakeRoles, FakeVerifier } from "./auth/fakes.ts";

let server: Server | undefined;

// The HTTP layer only forwards the pipeline result, so tests use minimal stand-ins.
async function start(
  extract: (year: number) => Promise<unknown>,
  extractSocialSecurity: (year: number) => Promise<unknown> = extract,
  research: (year: number) => Promise<unknown> = extract,
) {
  // Auth is covered in tests/auth; here every admin call is a verified admin.
  const app = createApp({
    allowedOrigins: [],
    readiness: { isReady: async () => true },
    publishedElections: { electionsIn: async () => [] },
    publishedTimelines: {
      timelines: async () => ({
        "per_diem.point_rate": [],
        "meal_allowance.rates": [],
      }),
    },
    auth: { verifier: new FakeVerifier(), roles: new FakeRoles() },
    extractIncomeTaxRules: extract as AppDeps["extractIncomeTaxRules"],
    extractSocialSecurityRules:
      extractSocialSecurity as AppDeps["extractSocialSecurityRules"],
    researchIncomeTax: research as AppDeps["researchIncomeTax"],
  });
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server!.once("listening", resolve));
  const { port } = server.address() as AddressInfo;
  return (path: string, init: RequestInit = {}) =>
    fetch(`http://127.0.0.1:${port}${path}`, init);
}

const post = {
  method: "POST",
  headers: { authorization: `Bearer ${ADMIN_TOKEN}` },
};

afterEach(() => {
  server?.close();
  server = undefined;
});

describe("api", () => {
  it("serves a health check", async () => {
    const request = await start(async () => ({}));
    const response = await request("/health");
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it("validates the year before running the pipeline", async () => {
    const extract = vi.fn(async () => ({}));
    const request = await start(extract);
    const response = await request("/admin/income-tax/20x0/rules", post);
    expect(response.status).toBe(400);
    expect(extract).not.toHaveBeenCalled();
  });

  it("returns the extraction result", async () => {
    const request = await start(async (year) => ({
      year,
      monthlyBrackets: [],
    }));
    const response = await request("/admin/income-tax/2020/rules", post);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ year: 2020, monthlyBrackets: [] });
  });

  it("maps pipeline errors to a stable error contract without internal details", async () => {
    const request = await start(async () => {
      throw new RulesPipelineError(
        "year_not_covered",
        "No bracket table for 2020 or any earlier year",
        { secret: "internal" },
      );
    });
    const response = await request("/admin/income-tax/2020/rules", post);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: {
        code: "year_not_covered",
        message: "No bracket table for 2020 or any earlier year",
      },
    });
  });

  it("routes each rules pipeline to its own path", async () => {
    const incomeTax = vi.fn(async () => ({ pipeline: "income-tax" }));
    const socialSecurity = vi.fn(async () => ({ pipeline: "social-security" }));
    const request = await start(incomeTax, socialSecurity);
    const response = await request("/admin/social-security/2026/rules", post);
    expect(await response.json()).toEqual({ pipeline: "social-security" });
    expect(socialSecurity).toHaveBeenCalledWith(2026);
    expect(incomeTax).not.toHaveBeenCalled();
  });

  it("serves income-tax research next to the existing rules route", async () => {
    const rules = vi.fn(async () => ({ pipeline: "rules" }));
    const research = vi.fn(async () => ({ pipeline: "research" }));
    const request = await start(rules, rules, research);
    const response = await request("/admin/income-tax/2026/research", post);
    expect(await response.json()).toEqual({ pipeline: "research" });
    expect(research).toHaveBeenCalledWith(2026);
    expect(rules).not.toHaveBeenCalled();
  });
});
