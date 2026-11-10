import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN_ID, ADMIN_TOKEN, USER_ID, USER_TOKEN } from "../auth/fakes.ts";
import {
  startUserDataApp,
  USER_DATA_SECRET,
  type SupabaseCall,
  type SupabaseReply,
} from "./harness.ts";

const CONFIG = "/me/months/2026/9/config";
const CREDIT = "/me/months/2026/9/shabbat-credit";

const ROW = {
  standard_hours: 6.67,
  base_rate: 57.5,
  unused_shabbat_credit_hours: 3,
};

type App = Awaited<ReturnType<typeof startUserDataApp>>;
type ErrorBody = { error: { code: string; message: string } };
let app: App;

const start = async (reply?: (call: SupabaseCall) => SupabaseReply) => {
  app = await startUserDataApp(reply);
  return app;
};

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(async () => {
  await app?.close();
  vi.restoreAllMocks();
});

describe("authentication", () => {
  it.each([
    ["GET", CONFIG, undefined],
    ["PUT", CONFIG, { standardHours: 6.67, baseRate: 50 }],
    ["PUT", CREDIT, { hours: 2 }],
  ])(
    "%s %s without a token is 401 and reaches no data",
    async (method, path, body) => {
      const { request, fetch } = await start();
      const response = await request(path, { method, body });
      expect(response.status).toBe(401);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("rejects an invalid or expired token", async () => {
    const { request, fetch } = await start();
    const response = await request(CONFIG, { token: "expired-token" });
    expect(response.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("GET /me/months/:year/:month/config", () => {
  it("returns the caller's config, read with the backend key and scoped to the token's user", async () => {
    const { request, calls } = await start(() => ({ status: 200, body: ROW }));

    const response = await request(CONFIG, { token: USER_TOKEN });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      config: {
        standardHours: 6.67,
        baseRate: 57.5,
        unusedShabbatCreditHours: 3,
      },
    });
    const [call] = calls;
    expect(call.url.pathname).toBe("/rest/v1/monthly_configs");
    expect(call.url.searchParams.get("user_id")).toBe(`eq.${USER_ID}`);
    expect(call.url.searchParams.get("year")).toBe("eq.2026");
    expect(call.url.searchParams.get("month")).toBe("eq.9");
    expect(call.headers.get("apikey")).toBe(USER_DATA_SECRET);
  });

  it("returns null for a month never saved", async () => {
    const { request } = await start(() => ({ status: 200, body: null }));
    const response = await request(CONFIG, { token: USER_TOKEN });
    expect(await response.json()).toEqual({ config: null });
  });

  it("scopes each caller to their own rows, whatever the request says", async () => {
    const { request, calls } = await start(() => ({ status: 200, body: null }));

    await request(`${CONFIG}?user_id=${USER_ID}&userId=${USER_ID}`, {
      token: ADMIN_TOKEN,
    });

    expect(calls[0].url.searchParams.getAll("user_id")).toEqual([
      `eq.${ADMIN_ID}`,
    ]);
  });

  it.each([
    "/me/months/2014/9/config",
    "/me/months/2101/9/config",
    "/me/months/2026/0/config",
    "/me/months/2026/13/config",
    "/me/months/abcd/9/config",
    "/me/months/2026/9.5/config",
  ])("rejects %s without reaching the database", async (path) => {
    const { request, fetch } = await start();
    const response = await request(path, { token: USER_TOKEN });
    expect(response.status).toBe(400);
    expect(((await response.json()) as ErrorBody).error.code).toBe(
      "invalid_request",
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each<[SupabaseReply, number, string]>([
    [{ networkError: true }, 503, "data_unavailable"],
    [
      { status: 503, body: { code: "PGRST001", message: "pool" } },
      503,
      "data_unavailable",
    ],
    [
      { status: 401, body: { code: "PGRST301", message: "bad key" } },
      500,
      "internal_error",
    ],
  ])("maps a Supabase failure %j to %i", async (reply, status, code) => {
    const { request } = await start(() => reply);
    const response = await request(CONFIG, { token: USER_TOKEN });
    expect(response.status).toBe(status);
    const body = (await response.json()) as ErrorBody;
    expect(body.error.code).toBe(code);
    expect(JSON.stringify(body)).not.toContain("bad key");
  });
});

describe("PUT /me/months/:year/:month/config", () => {
  it("upserts only the typed settings for the caller, never the Shabbat credit", async () => {
    const { request, calls } = await start(() => ({ status: 201 }));

    const response = await request(CONFIG, {
      token: USER_TOKEN,
      method: "PUT",
      body: { standardHours: 6.67, baseRate: 60 },
    });

    expect(response.status).toBe(204);
    const [call] = calls;
    expect(call.method).toBe("POST");
    expect(call.url.pathname).toBe("/rest/v1/monthly_configs");
    expect(call.url.searchParams.get("on_conflict")).toBe("user_id,year,month");
    expect(call.headers.get("prefer")).toContain("resolution=merge-duplicates");
    expect(call.body).toEqual({
      year: 2026,
      month: 9,
      standard_hours: 6.67,
      base_rate: 60,
      updated_at: expect.any(String),
      user_id: USER_ID,
    });
  });

  it.each([
    [{ standardHours: 6.67 }],
    [{ standardHours: -1, baseRate: 50 }],
    [{ standardHours: 6.67, baseRate: "50" }],
    [{ standardHours: 6.67, baseRate: 50, userId: ADMIN_ID }],
    [{ standardHours: 6.67, baseRate: 50, user_id: ADMIN_ID }],
    [{ standardHours: 6.67, baseRate: 50, unusedShabbatCreditHours: 9 }],
    [[]],
  ])("rejects the body %j", async (body) => {
    const { request, fetch } = await start();
    const response = await request(CONFIG, {
      token: USER_TOKEN,
      method: "PUT",
      body,
    });
    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON", async () => {
    const { request, fetch } = await start();
    const response = await request(CONFIG, {
      token: USER_TOKEN,
      method: "PUT",
      body: "{not json",
    });
    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("PUT /me/months/:year/:month/shabbat-credit", () => {
  it("upserts only the credit for the caller, never the typed settings", async () => {
    const { request, calls } = await start(() => ({ status: 201 }));

    const response = await request(CREDIT, {
      token: ADMIN_TOKEN,
      method: "PUT",
      body: { hours: 4.5 },
    });

    expect(response.status).toBe(204);
    expect(calls[0].url.searchParams.get("on_conflict")).toBe(
      "user_id,year,month",
    );
    expect(calls[0].body).toEqual({
      year: 2026,
      month: 9,
      unused_shabbat_credit_hours: 4.5,
      updated_at: expect.any(String),
      user_id: ADMIN_ID,
    });
  });

  it.each([[{ hours: -0.5 }], [{}], [{ hours: 2, baseRate: 1 }]])(
    "rejects the body %j",
    async (body) => {
      const { request, fetch } = await start();
      const response = await request(CREDIT, {
        token: USER_TOKEN,
        method: "PUT",
        body,
      });
      expect(response.status).toBe(400);
      expect(fetch).not.toHaveBeenCalled();
    },
  );
});
