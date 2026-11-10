import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { vi } from "vitest";
import { createApp, type AppDeps } from "../../src/app.ts";
import { supabaseUserDataAccess } from "../../src/repositories/user-scope.ts";
import { FakeRoles, FakeVerifier, NO_ACCOUNTS } from "../auth/fakes.ts";

export const USER_DATA_SECRET = "sb_secret_user_data_test";

export type SupabaseCall = {
  url: URL;
  method: string;
  headers: Headers;
  body: unknown;
};

/** What the fake Supabase answers: a JSON body and status, or a network failure. */
export type SupabaseReply =
  { status: number; body?: unknown } | { networkError: true };

/**
 * The real app and the real UserScope, with only Supabase's HTTP replaced:
 * a test sees every query exactly as PostgREST would receive it.
 */
export const startUserDataApp = async (
  reply: (call: SupabaseCall) => SupabaseReply = () => ({
    status: 200,
    body: [],
  }),
  {
    verifier = new FakeVerifier(),
    accounts = NO_ACCOUNTS,
  }: { verifier?: FakeVerifier; accounts?: AppDeps["accounts"] } = {},
) => {
  const calls: SupabaseCall[] = [];
  const fetch = vi.fn<typeof globalThis.fetch>(async (input, init) => {
    const call: SupabaseCall = {
      url: new URL(String(input)),
      method: init?.method ?? "GET",
      headers: new Headers(init?.headers),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    };
    calls.push(call);
    const outcome = reply(call);
    if ("networkError" in outcome) throw new TypeError("fetch failed");
    return new Response(
      outcome.body === undefined ? null : JSON.stringify(outcome.body),
      {
        status: outcome.status,
        headers: { "content-type": "application/json" },
      },
    );
  });

  const unused = vi.fn();
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
    auth: { verifier, roles: new FakeRoles() },
    userData: supabaseUserDataAccess({
      url: "https://project.supabase.co",
      secretKey: USER_DATA_SECRET,
      fetch,
    }),
    accounts,
    extractIncomeTaxRules: unused as AppDeps["extractIncomeTaxRules"],
    researchIncomeTax: unused as AppDeps["researchIncomeTax"],
  });

  const server: Server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address() as AddressInfo;

  const request = (
    path: string,
    {
      token,
      method = "GET",
      body,
    }: {
      token?: string;
      method?: string;
      body?: unknown;
    } = {},
  ) =>
    globalThis.fetch(`http://127.0.0.1:${port}${path}`, {
      method,
      headers: {
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      body:
        body === undefined
          ? undefined
          : typeof body === "string"
            ? body
            : JSON.stringify(body),
    });

  const close = () =>
    new Promise<void>((resolve) => server.close(() => resolve()));

  return { request, calls, fetch, close };
};
