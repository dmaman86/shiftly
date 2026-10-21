import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, type AppDeps } from "../../src/app.ts";
import { SupabaseReadinessCheck } from "../../src/http/readiness.ts";
import { FakeRoles, FakeVerifier } from "../auth/fakes.ts";

const WEB_ORIGIN = "https://web.example";

let server: Server | undefined;

async function start(ready = true) {
  const unused = vi.fn();
  const app = createApp({
    allowedOrigins: [WEB_ORIGIN],
    readiness: { isReady: async () => ready },
    publishedElections: { electionsIn: async () => [] },
    auth: { verifier: new FakeVerifier(), roles: new FakeRoles() },
    extractIncomeTaxRules: unused as AppDeps["extractIncomeTaxRules"],
    extractSocialSecurityRules: unused as AppDeps["extractSocialSecurityRules"],
    researchIncomeTax: unused as AppDeps["researchIncomeTax"],
  });
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server!.once("listening", resolve));
  const { port } = server.address() as AddressInfo;
  return (path: string, init: RequestInit = {}) =>
    fetch(`http://127.0.0.1:${port}${path}`, init);
}

const preflight = (origin: string): RequestInit => ({
  method: "OPTIONS",
  headers: {
    origin,
    "access-control-request-method": "GET",
    "access-control-request-headers": "authorization",
  },
});

afterEach(() => {
  server?.close();
  server = undefined;
  vi.restoreAllMocks();
});

describe("CORS", () => {
  it("lets an allowed origin read responses", async () => {
    const request = await start();
    const response = await request("/health", {
      headers: { origin: WEB_ORIGIN },
    });
    expect(response.headers.get("access-control-allow-origin")).toBe(
      WEB_ORIGIN,
    );
    expect(response.headers.get("vary")).toContain("Origin");
    expect(response.headers.get("access-control-allow-credentials")).toBeNull();
  });

  it("never allows an origin outside the list", async () => {
    const request = await start();
    const response = await request("/health", {
      headers: { origin: "https://evil.example" },
    });
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("answers an allowed preflight with the methods and headers it accepts", async () => {
    const request = await start();
    const response = await request("/me", preflight(WEB_ORIGIN));
    expect(response.status).toBe(204);
    expect(response.headers.get("access-control-allow-origin")).toBe(
      WEB_ORIGIN,
    );
    expect(response.headers.get("access-control-allow-headers")).toBe(
      "Authorization, Content-Type",
    );
    expect(response.headers.get("access-control-allow-methods")).toContain(
      "DELETE",
    );
  });

  it("refuses a preflight from an unknown origin", async () => {
    const request = await start();
    const response = await request("/me", preflight("https://evil.example"));
    expect(response.status).toBe(403);
    expect(response.headers.get("access-control-allow-origin")).toBeNull();
  });
});

describe("readiness", () => {
  it("reports ready when Supabase is reachable", async () => {
    const request = await start(true);
    const response = await request("/ready");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "ready" });
  });

  it("reports 503 when Supabase is not, while liveness stays up", async () => {
    const request = await start(false);
    expect((await request("/ready")).status).toBe(503);
    expect((await request("/health")).status).toBe(200);
  });
});

describe("request bodies", () => {
  it("rejects malformed JSON with 400, before any handler runs", async () => {
    const request = await start();
    const response = await request("/me", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json",
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: {
        code: "invalid_json",
        message: "Request body is not valid JSON",
      },
    });
  });

  it("rejects bodies over the size limit with 413", async () => {
    const request = await start();
    const response = await request("/me", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ padding: "x".repeat(200_000) }),
    });
    expect(response.status).toBe(413);
  });
});

describe("request log", () => {
  it("logs one line per request without the query string or the token", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const request = await start();
    const response = await request("/me?secret=query-value", {
      headers: { authorization: "Bearer token-value-never-logged" },
    });
    await response.text();
    await vi.waitFor(() => expect(log).toHaveBeenCalled());

    const line = String(log.mock.calls[0]?.[0]);
    expect(JSON.parse(line)).toMatchObject({
      severity: "WARNING",
      event: "http_request",
      method: "GET",
      path: "/me",
      status: 401,
      requestId: response.headers.get("x-request-id"),
    });
    expect(line).not.toContain("query-value");
    expect(line).not.toContain("token-value-never-logged");
  });

  it("does not log liveness probes", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const request = await start();
    await (await request("/health")).text();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(log).not.toHaveBeenCalled();
  });
});

describe("SupabaseReadinessCheck", () => {
  const options = {
    url: "https://project.supabase.co",
    publishableKey: "sb_publishable_test",
  };

  it("asks the Auth health endpoint with the publishable key", async () => {
    const fetch = vi.fn(async () => new Response("{}", { status: 200 }));
    const check = new SupabaseReadinessCheck({ ...options, fetch });
    expect(await check.isReady()).toBe(true);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://project.supabase.co/auth/v1/health");
    expect(init.headers).toEqual({ apikey: "sb_publishable_test" });
  });

  it("is not ready on an error status or a network failure", async () => {
    const down = new SupabaseReadinessCheck({
      ...options,
      fetch: async () => new Response("", { status: 503 }),
    });
    const unreachable = new SupabaseReadinessCheck({
      ...options,
      fetch: async () => {
        throw new TypeError("fetch failed");
      },
    });
    expect(await down.isReady()).toBe(false);
    expect(await unreachable.isReady()).toBe(false);
  });
});
