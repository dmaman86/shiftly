import { describe, expect, it, vi } from "vitest";
import {
  userDataErrorFrom,
  type UserDataError,
} from "../../src/user-data/errors.ts";
import { supabaseUserClientFactory } from "../../src/user-data/supabase-user-client.ts";
import { ADMIN_ID, ADMIN_TOKEN, USER_ID, USER_TOKEN } from "../auth/fakes.ts";

const PUBLISHABLE = "sb_publishable_test";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

function factoryWith(respond: () => Promise<Response>) {
  const fetch = vi.fn<typeof globalThis.fetch>(respond);
  const clientFor = supabaseUserClientFactory({
    url: "https://project.supabase.co",
    publishableKey: PUBLISHABLE,
    fetch,
  });
  const request = (index: number) => {
    const [input, init] = fetch.mock.calls[index];
    return { url: new URL(String(input)), headers: new Headers(init?.headers) };
  };
  return { clientFor, request };
}

const user = { userId: USER_ID, accessToken: USER_TOKEN };
const otherUser = { userId: ADMIN_ID, accessToken: ADMIN_TOKEN };

describe("supabaseUserClientFactory", () => {
  it("queries as the caller: publishable key plus the caller's own token", async () => {
    const { clientFor, request } = factoryWith(async () => json([]));

    await clientFor(user).from("shifts").select("id").eq("user_id", USER_ID);

    const { url, headers } = request(0);
    expect(url.pathname).toBe("/rest/v1/shifts");
    expect(headers.get("apikey")).toBe(PUBLISHABLE);
    expect(headers.get("authorization")).toBe(`Bearer ${USER_TOKEN}`);
  });

  it("calls RPCs as the caller too, so auth.uid() is the token's subject", async () => {
    const { clientFor, request } = factoryWith(async () => json(null));

    await clientFor(user).rpc("import_guest_month", {});

    const { url, headers } = request(0);
    expect(url.pathname).toBe("/rest/v1/rpc/import_guest_month");
    expect(headers.get("authorization")).toBe(`Bearer ${USER_TOKEN}`);
  });

  it("shares nothing between users: each client sends only its own token", async () => {
    const { clientFor, request } = factoryWith(async () => json([]));
    const first = clientFor(user);
    const second = clientFor(otherUser);

    await second.from("shifts").select("id");
    await first.from("shifts").select("id");

    expect(request(0).headers.get("authorization")).toBe(
      `Bearer ${ADMIN_TOKEN}`,
    );
    expect(request(1).headers.get("authorization")).toBe(
      `Bearer ${USER_TOKEN}`,
    );
  });

  it("manages no session: the token is only forwarded", () => {
    const { clientFor } = factoryWith(async () => json([]));
    expect(() => clientFor(user).auth.getSession()).toThrow(/accessToken/);
  });
});

describe("supabase-js failures, mapped", () => {
  const failureOf = async (respond: () => Promise<Response>) => {
    const { clientFor } = factoryWith(respond);
    // postgrest-js retries idempotent reads on network errors and 503 by
    // itself; off here so the first failure is the one mapped.
    const { error, status } = await clientFor(user)
      .from("shifts")
      .select("id")
      .retry(false);
    expect(error).not.toBeNull();
    return userDataErrorFrom({ status, error: error! });
  };

  it("an expired token is unauthenticated", async () => {
    const mapped: UserDataError = await failureOf(async () =>
      json({ code: "PGRST303", message: "JWT expired" }, 401),
    );
    expect(mapped.code).toBe("unauthenticated");
  });

  it("a row RLS hides is not found", async () => {
    const mapped = await failureOf(async () =>
      json(
        {
          code: "42501",
          message: 'new row violates row-level security policy for "shifts"',
        },
        403,
      ),
    );
    expect(mapped.code).toBe("not_found");
  });

  it("a network failure is unavailable, not an error of the request", async () => {
    const mapped = await failureOf(async () => {
      throw new TypeError("fetch failed");
    });
    expect(mapped.code).toBe("data_unavailable");
  });
});
