import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.ts";
import {
  ADMIN_TOKEN,
  FakeRoles,
  FakeVerifier,
  NO_ACCOUNTS,
  NO_USER_DATA,
} from "./auth/fakes.ts";

let server: Server | undefined;

// HTTP composition deliberately has no research dependency.
const start = async () => {
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
    userData: NO_USER_DATA,
    accounts: NO_ACCOUNTS,
  });
  server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server!.once("listening", resolve));
  const { port } = server.address() as AddressInfo;
  return (path: string, init: RequestInit = {}) =>
    fetch(`http://127.0.0.1:${port}${path}`, init);
};

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
    const request = await start();
    const response = await request("/health");
    expect(await response.json()).toEqual({ status: "ok" });
  });

  it.each(["2026/rules", "2026/research", "20x0/rules"])(
    "retires year-only income tax endpoint %s without running a pipeline",
    async (path) => {
      const request = await start();
      const response = await request(`/admin/income-tax/${path}`, post);
      expect(response.status).toBe(410);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.json()).toEqual({
        error: {
          code: "research_route_retired",
          message:
            "Use the reference:research administrative CLI with explicit --year, --month and --parameters",
        },
      });
    },
  );
});
