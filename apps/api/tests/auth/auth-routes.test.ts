import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createApp } from "../../src/app.ts";
import {
  ADMIN_ID,
  ADMIN_TOKEN,
  FakeRoles,
  FakeVerifier,
  USER_ID,
  USER_TOKEN,
} from "./fakes.ts";

const ADMIN_ROUTES = [
  "/admin/income-tax/2026/rules",
  "/admin/social-security/2026/rules",
  "/admin/income-tax/2026/research",
];

let server: Server | undefined;
let verifier: FakeVerifier;
let roles: FakeRoles;
let pipeline: ReturnType<typeof vi.fn>;
let warn: ReturnType<typeof vi.spyOn>;
type ErrorBody = { error: { code: string } };
let error: ReturnType<typeof vi.spyOn>;

async function start() {
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
    auth: { verifier, roles },
    extractIncomeTaxRules: pipeline,
    extractSocialSecurityRules: pipeline,
    researchIncomeTax: pipeline,
  } as Parameters<typeof createApp>[0]);
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server!.once("listening", resolve));
  const { port } = server.address() as AddressInfo;
  return (path: string, init: RequestInit = {}) =>
    fetch(`http://127.0.0.1:${port}${path}`, init);
}

const bearer = (token: string, init: RequestInit = {}): RequestInit => ({
  ...init,
  headers: { ...(init.headers as object), authorization: `Bearer ${token}` },
});
const post = (token?: string, init: RequestInit = {}) =>
  token
    ? bearer(token, { ...init, method: "POST" })
    : { ...init, method: "POST" };

beforeEach(() => {
  verifier = new FakeVerifier();
  roles = new FakeRoles();
  pipeline = vi.fn(async () => ({ ran: true }));
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  error = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  server?.close();
  server = undefined;
  warn.mockRestore();
  error.mockRestore();
});

describe("authentication (401)", () => {
  it.each([
    ["no Authorization header", {}],
    [
      "a non-Bearer scheme",
      { headers: { authorization: "Basic dXNlcjpwYXNz" } },
    ],
    ["an empty Bearer token", { headers: { authorization: "Bearer " } }],
    ["a token with spaces", { headers: { authorization: "Bearer a b" } }],
    ["an invalid or expired token", bearer("expired-token")],
  ])("rejects %s with 401 and a Bearer challenge", async (_case, init) => {
    const request = await start();
    for (const path of ["/me", ADMIN_ROUTES[0]]) {
      const response = await request(path, {
        ...(init as RequestInit),
        method: path === "/me" ? "GET" : "POST",
      });
      expect(response.status).toBe(401);
      expect(response.headers.get("www-authenticate")).toBe("Bearer");
      expect(await response.json()).toEqual({
        error: { code: "unauthenticated", message: "Authentication required" },
      });
    }
    expect(pipeline).not.toHaveBeenCalled();
  });

  it("keeps /health public", async () => {
    const request = await start();
    expect((await request("/health")).status).toBe(200);
  });

  it("returns 503, not 401, when the token cannot be checked", async () => {
    verifier.verifyUnavailable = true;
    const request = await start();
    const response = await request("/me", bearer(USER_TOKEN));
    expect(response.status).toBe(503);
    expect(((await response.json()) as ErrorBody).error.code).toBe(
      "authentication_unavailable",
    );
  });
});

describe("GET /me", () => {
  it("returns the implicit user role for a normal user", async () => {
    const request = await start();
    const response = await request("/me", bearer(USER_TOKEN));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ userId: USER_ID, roles: ["user"] });
  });

  it("adds the stored admin role for an admin", async () => {
    const request = await start();
    const response = await request("/me", bearer(ADMIN_TOKEN));
    expect(await response.json()).toEqual({
      userId: ADMIN_ID,
      roles: ["user", "admin"],
    });
  });

  it("uses the cheap token check only, never the Auth server", async () => {
    const request = await start();
    await request("/me", bearer(ADMIN_TOKEN));
    expect(verifier.verifyCalls).toBe(1);
    expect(verifier.revalidateCalls).toBe(0);
  });

  it("fails closed with 503 when roles cannot be read", async () => {
    roles.unavailable = true;
    const request = await start();
    const response = await request("/me", bearer(USER_TOKEN));
    expect(response.status).toBe(503);
  });
});

describe("admin routes", () => {
  it.each(ADMIN_ROUTES)(
    "forbids a normal user on %s with 403",
    async (path) => {
      const request = await start();
      const response = await request(path, post(USER_TOKEN));
      expect(response.status).toBe(403);
      expect(await response.json()).toEqual({
        error: { code: "forbidden", message: "Admin role required" },
      });
      expect(pipeline).not.toHaveBeenCalled();
    },
  );

  it.each(ADMIN_ROUTES)("lets a verified admin run %s", async (path) => {
    const request = await start();
    const response = await request(path, post(ADMIN_TOKEN));
    expect(response.status).toBe(200);
    expect(pipeline).toHaveBeenCalledWith(2026);
    expect(verifier.revalidateCalls).toBe(1);
  });

  it("ignores roles claimed by the client in headers or body", async () => {
    const request = await start();
    const response = await request(
      ADMIN_ROUTES[2],
      post(USER_TOKEN, {
        headers: {
          "x-role": "admin",
          "x-shiftly-role": "admin",
          "content-type": "application/json",
        },
        body: JSON.stringify({ role: "admin", roles: ["admin"] }),
      }),
    );
    expect(response.status).toBe(403);
    expect(pipeline).not.toHaveBeenCalled();
  });

  it("applies a revoked role on the very next request", async () => {
    const request = await start();
    expect((await request(ADMIN_ROUTES[2], post(ADMIN_TOKEN))).status).toBe(
      200,
    );

    roles.roles.delete(ADMIN_ID);

    expect((await request(ADMIN_ROUTES[2], post(ADMIN_TOKEN))).status).toBe(
      403,
    );
    expect(pipeline).toHaveBeenCalledOnce();
  });

  it("rejects an admin whose session the Auth server no longer accepts", async () => {
    verifier.revokedSessions.add(ADMIN_TOKEN);
    const request = await start();
    const response = await request(ADMIN_ROUTES[2], post(ADMIN_TOKEN));
    expect(response.status).toBe(401);
    expect(pipeline).not.toHaveBeenCalled();
  });

  it("fails closed with 503 when roles cannot be read", async () => {
    roles.unavailable = true;
    const request = await start();
    const response = await request(ADMIN_ROUTES[2], post(ADMIN_TOKEN));
    expect(response.status).toBe(503);
    expect(((await response.json()) as ErrorBody).error.code).toBe(
      "authorization_unavailable",
    );
    expect(pipeline).not.toHaveBeenCalled();
  });

  it("fails closed with 503 when the session cannot be revalidated", async () => {
    verifier.revalidateUnavailable = true;
    const request = await start();
    const response = await request(ADMIN_ROUTES[2], post(ADMIN_TOKEN));
    expect(response.status).toBe(503);
    expect(pipeline).not.toHaveBeenCalled();
  });

  it("does not reveal which admin paths exist to unauthenticated callers", async () => {
    const request = await start();
    const response = await request("/admin/does-not-exist", post());
    expect(response.status).toBe(401);
  });
});
