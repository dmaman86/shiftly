import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN_ID, ADMIN_TOKEN, USER_TOKEN } from "../auth/fakes.ts";
import {
  startUserDataApp,
  type SupabaseCall,
  type SupabaseReply,
} from "./harness.ts";

const IMPORT = "/me/months/2026/9/guest-import";

const SHIFT = {
  date: "2026-09-05",
  startTime: "2026-09-05T05:00:00.000Z",
  endTime: "2026-09-05T13:00:00.000Z",
  isDuty: true,
};

const GUEST = {
  standardHours: 6.67,
  baseRate: 60,
  days: [{ date: "2026-09-02", status: "sick" }],
  shifts: [SHIFT],
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

describe("POST /me/months/:year/:month/guest-import", () => {
  it("replaces the month through api_import_guest_month, owned by the token's user", async () => {
    const { request, calls } = await start(() => ({ status: 204 }));

    const response = await request(IMPORT, {
      token: ADMIN_TOKEN,
      method: "POST",
      body: GUEST,
    });

    expect(response.status).toBe(204);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const [call] = calls;
    expect(call.method).toBe("POST");
    expect(call.url.pathname).toBe("/rest/v1/rpc/api_import_guest_month");
    expect(call.body).toEqual({
      p_year: 2026,
      p_month: 9,
      p_standard_hours: 6.67,
      p_base_rate: 60,
      p_days: [{ date: "2026-09-02", status: "sick" }],
      p_shifts: [
        {
          date: "2026-09-05",
          start_time: SHIFT.startTime,
          end_time: SHIFT.endTime,
          is_duty: true,
        },
      ],
      p_user_id: ADMIN_ID,
    });
  });

  it("imports an empty month: only the settings", async () => {
    const { request, calls } = await start(() => ({ status: 204 }));
    const response = await request(IMPORT, {
      token: USER_TOKEN,
      method: "POST",
      body: { ...GUEST, days: [], shifts: [] },
    });
    expect(response.status).toBe(204);
    expect(calls).toHaveLength(1);
  });

  it("maps a database rejection to invalid_request", async () => {
    const { request } = await start(() => ({
      status: 400,
      body: { code: "22023", message: "Invalid shift in payload" },
    }));
    const response = await request(IMPORT, {
      token: USER_TOKEN,
      method: "POST",
      body: GUEST,
    });
    expect(response.status).toBe(400);
    expect(((await response.json()) as ErrorBody).error.code).toBe(
      "invalid_request",
    );
  });

  it("requires a token", async () => {
    const { request, fetch } = await start();
    const response = await request(IMPORT, { method: "POST", body: GUEST });
    expect(response.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });

  it.each([
    ["a user id", { ...GUEST, userId: ADMIN_ID }],
    ["p_user_id", { ...GUEST, p_user_id: ADMIN_ID }],
    ["a shift id", { ...GUEST, shifts: [{ ...SHIFT, id: "shift-1" }] }],
    [
      "a day of another month",
      { ...GUEST, days: [{ date: "2026-10-01", status: "sick" }] },
    ],
    [
      "a shift of another month",
      { ...GUEST, shifts: [{ ...SHIFT, date: "2026-08-31" }] },
    ],
    [
      "a normal day",
      { ...GUEST, days: [{ date: "2026-09-02", status: "normal" }] },
    ],
    [
      "a shift ending before it starts",
      { ...GUEST, shifts: [{ ...SHIFT, endTime: SHIFT.startTime }] },
    ],
    ["a negative rate", { ...GUEST, baseRate: -1 }],
    ["no shifts list", { standardHours: 6.67, baseRate: 60, days: [] }],
    [
      "too many days",
      { ...GUEST, days: Array.from({ length: 32 }, () => GUEST.days[0]) },
    ],
    [
      "too many shifts",
      { ...GUEST, shifts: Array.from({ length: 201 }, () => SHIFT) },
    ],
  ])("rejects %s without reaching the database", async (_label, body) => {
    const { request, fetch } = await start();
    const response = await request(IMPORT, {
      token: USER_TOKEN,
      method: "POST",
      body,
    });
    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("rejects a month outside the supported range", async () => {
    const { request, fetch } = await start();
    const response = await request("/me/months/2014/9/guest-import", {
      token: USER_TOKEN,
      method: "POST",
      body: GUEST,
    });
    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
});
