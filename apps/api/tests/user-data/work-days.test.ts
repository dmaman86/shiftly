import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN_ID, ADMIN_TOKEN, USER_ID, USER_TOKEN } from "../auth/fakes.ts";
import {
  startUserDataApp,
  type SupabaseCall,
  type SupabaseReply,
} from "./harness.ts";

type App = Awaited<ReturnType<typeof startUserDataApp>>;
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

describe("GET /me/months/:year/:month/work-days", () => {
  it("returns the caller's marked days of that month only", async () => {
    const { request, calls } = await start(() => ({
      status: 200,
      body: [{ date: "2026-09-02", status: "sick" }],
    }));

    const response = await request("/me/months/2026/9/work-days", {
      token: USER_TOKEN,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({
      workDays: [{ date: "2026-09-02", status: "sick" }],
    });
    const [call] = calls;
    expect(call.url.pathname).toBe("/rest/v1/work_days");
    expect(call.url.searchParams.getAll("user_id")).toEqual([`eq.${USER_ID}`]);
    expect(call.url.searchParams.getAll("date")).toEqual([
      "gte.2026-09-01",
      "lt.2026-10-01",
    ]);
  });

  it("ends December at the next year's first day", async () => {
    const { request, calls } = await start();
    await request("/me/months/2026/12/work-days", { token: USER_TOKEN });
    expect(calls[0].url.searchParams.getAll("date")).toEqual([
      "gte.2026-12-01",
      "lt.2027-01-01",
    ]);
  });

  it("requires a token", async () => {
    const { request, fetch } = await start();
    const response = await request("/me/months/2026/9/work-days");
    expect(response.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("PUT /me/work-days/:date", () => {
  it.each(["vacation", "sick"])(
    "upserts %s on the caller's (user, date) row",
    async (status) => {
      const { request, calls } = await start(() => ({ status: 201 }));

      const response = await request("/me/work-days/2026-09-02", {
        token: ADMIN_TOKEN,
        method: "PUT",
        body: { status },
      });

      expect(response.status).toBe(204);
      const [call] = calls;
      expect(call.method).toBe("POST");
      expect(call.url.searchParams.get("on_conflict")).toBe("user_id,date");
      expect(call.body).toEqual({
        date: "2026-09-02",
        status,
        updated_at: expect.any(String),
        user_id: ADMIN_ID,
      });
    },
  );

  it("deletes the caller's row when the day goes back to normal", async () => {
    const { request, calls } = await start(() => ({ status: 204 }));

    const response = await request("/me/work-days/2026-09-02", {
      token: USER_TOKEN,
      method: "PUT",
      body: { status: "normal" },
    });

    expect(response.status).toBe(204);
    const [call] = calls;
    expect(call.method).toBe("DELETE");
    expect(call.url.searchParams.get("user_id")).toBe(`eq.${USER_ID}`);
    expect(call.url.searchParams.get("date")).toBe("eq.2026-09-02");
  });

  it.each([
    ["/me/work-days/2026-02-29", { status: "sick" }],
    ["/me/work-days/2014-12-31", { status: "sick" }],
    ["/me/work-days/2026-9-2", { status: "sick" }],
    ["/me/work-days/2026-09-02", { status: "holiday" }],
    ["/me/work-days/2026-09-02", { status: "sick", user_id: ADMIN_ID }],
    ["/me/work-days/2026-09-02", {}],
  ])("rejects %s %j", async (path, body) => {
    const { request, fetch } = await start();
    const response = await request(path, {
      token: USER_TOKEN,
      method: "PUT",
      body,
    });
    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
});
