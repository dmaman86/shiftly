import { describe, expect, it, vi } from "vitest";
import { UserDataError } from "../../src/errors/user-data-errors.ts";
import {
  dataOrThrow,
  supabaseUserDataAccess,
  type OwnedRow,
} from "../../src/repositories/user-scope.ts";
import { ADMIN_ID, ADMIN_TOKEN, USER_ID, USER_TOKEN } from "../auth/fakes.ts";

const SECRET = "sb_secret_user_data_test";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const accessWith = (
  respond: () => Promise<Response> = async () => json([]),
) => {
  const fetch = vi.fn<typeof globalThis.fetch>(respond);
  const access = supabaseUserDataAccess({
    url: "https://project.supabase.co",
    secretKey: SECRET,
    fetch,
  });
  const request = (index = 0) => {
    const [input, init] = fetch.mock.calls[index];
    return {
      url: new URL(String(input)),
      method: init?.method ?? "GET",
      headers: new Headers(init?.headers),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    };
  };
  return { access, fetch, request };
};

const user = { userId: USER_ID, accessToken: USER_TOKEN };
const otherUser = { userId: ADMIN_ID, accessToken: ADMIN_TOKEN };

describe("UserScope", () => {
  it("uses the backend secret key, never the caller's token", async () => {
    const { access, request } = accessWith();

    await access.scopeFor(user).select("shifts", "id");

    const { headers } = request();
    expect(headers.get("apikey")).toBe(SECRET);
    expect(headers.get("authorization")).toBe(`Bearer ${SECRET}`);
    expect(headers.get("authorization")).not.toContain(USER_TOKEN);
  });

  it("reads only the caller's rows", async () => {
    const { access, request } = accessWith();

    await access
      .scopeFor(user)
      .select("shifts", "id, date")
      .gte("date", "2026-09-01");

    const { url } = request();
    expect(url.pathname).toBe("/rest/v1/shifts");
    expect(url.searchParams.get("user_id")).toBe(`eq.${USER_ID}`);
    expect(url.searchParams.get("date")).toBe("gte.2026-09-01");
  });

  it("deletes only among the caller's rows", async () => {
    const { access, request } = accessWith(async () => json(null, 204));

    await access.scopeFor(user).delete("shifts").eq("id", "shift-1");

    const { url, method } = request();
    expect(method).toBe("DELETE");
    expect(url.searchParams.get("user_id")).toBe(`eq.${USER_ID}`);
    expect(url.searchParams.get("id")).toBe("eq.shift-1");
  });

  it("writes the caller as owner, whatever the row says", async () => {
    const { access, request } = accessWith(async () => json(null, 201));
    const forged = { year: 2026, month: 9, user_id: ADMIN_ID } as unknown;

    await access
      .scopeFor(user)
      .upsert("monthly_configs", forged as OwnedRow, "user_id,year,month");

    const { body, url } = request();
    expect(body).toMatchObject({ year: 2026, month: 9, user_id: USER_ID });
    expect(url.searchParams.get("on_conflict")).toBe("user_id,year,month");
  });

  it("refuses an upsert whose conflict key could match another user's row", () => {
    const { access, fetch } = accessWith();

    expect(() =>
      access.scopeFor(user).upsert("shifts", { date: "2026-09-01" }, "id"),
    ).toThrow(/includes user_id/);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("passes the caller as p_user_id to backend-only functions, overriding any value", async () => {
    const { access, request } = accessWith(async () => json(null));

    await access
      .scopeFor(user)
      .rpc("api_example", { p_year: 2026, p_user_id: ADMIN_ID });

    const { url, body } = request();
    expect(url.pathname).toBe("/rest/v1/rpc/api_example");
    expect(body).toEqual({ p_year: 2026, p_user_id: USER_ID });
  });

  it("keeps each request's scope to its own user", async () => {
    const { access, request } = accessWith();
    const first = access.scopeFor(user);
    const second = access.scopeFor(otherUser);

    await second.select("work_days", "date");
    await first.select("work_days", "date");

    expect(request(0).url.searchParams.get("user_id")).toBe(`eq.${ADMIN_ID}`);
    expect(request(1).url.searchParams.get("user_id")).toBe(`eq.${USER_ID}`);
  });

  it("refuses to build a scope without a verified user id", () => {
    const { access } = accessWith();
    expect(() => access.scopeFor({ userId: "", accessToken: "x" })).toThrow();
  });
});

describe("dataOrThrow", () => {
  it("returns the data of a successful query", async () => {
    const { access } = accessWith(async () => json([{ date: "2026-09-01" }]));
    expect(
      await dataOrThrow(access.scopeFor(user).select("work_days", "date")),
    ).toEqual([{ date: "2026-09-01" }]);
  });

  it("throws the mapped error, without the database message reaching the client code", async () => {
    const { access } = accessWith(async () =>
      json({ code: "23514", message: "violates check constraint" }, 400),
    );
    const failure = dataOrThrow(
      access.scopeFor(user).select("work_days", "date"),
    );
    await expect(failure).rejects.toBeInstanceOf(UserDataError);
    await expect(failure).rejects.toMatchObject({ code: "invalid_request" });
  });

  it("reports a network failure as unavailable, without retrying reads", async () => {
    const { access, fetch } = accessWith(async () => {
      throw new TypeError("fetch failed");
    });
    await expect(
      dataOrThrow(access.scopeFor(user).select("shifts", "id")),
    ).rejects.toMatchObject({ code: "data_unavailable" });
    expect(fetch).toHaveBeenCalledOnce();
  });
});
