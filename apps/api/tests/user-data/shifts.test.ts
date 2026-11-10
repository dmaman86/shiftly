import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN_ID, ADMIN_TOKEN, USER_ID, USER_TOKEN } from "../auth/fakes.ts";
import {
  startUserDataApp,
  type SupabaseCall,
  type SupabaseReply,
} from "./harness.ts";

const SHIFT_ID = "6f1c2a9e-3b4d-4c5e-8f60-718293a4b5c6";
const SHIFT = {
  date: "2026-09-02",
  startTime: "2026-09-02T05:00:00.000Z",
  endTime: "2026-09-02T13:00:00.000Z",
  isDuty: false,
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

describe("GET /me/months/:year/:month/shifts", () => {
  it("returns the caller's shifts of that month, mapped to the API shape", async () => {
    const { request, calls } = await start(() => ({
      status: 200,
      body: [
        {
          id: SHIFT_ID,
          date: "2026-09-02",
          start_time: "2026-09-02T05:00:00+00:00",
          end_time: "2026-09-02T13:00:00+00:00",
          is_duty: true,
        },
      ],
    }));

    const response = await request("/me/months/2026/9/shifts", {
      token: USER_TOKEN,
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      shifts: [
        {
          id: SHIFT_ID,
          date: "2026-09-02",
          startTime: "2026-09-02T05:00:00+00:00",
          endTime: "2026-09-02T13:00:00+00:00",
          isDuty: true,
        },
      ],
    });
    const [call] = calls;
    expect(call.url.pathname).toBe("/rest/v1/shifts");
    expect(call.url.searchParams.getAll("user_id")).toEqual([`eq.${USER_ID}`]);
    expect(call.url.searchParams.getAll("date")).toEqual([
      "gte.2026-09-01",
      "lt.2026-10-01",
    ]);
  });
});

describe("PUT /me/shifts/:id", () => {
  it("saves through api_upsert_shift with the token's user as owner", async () => {
    const { request, calls } = await start(() => ({ status: 200, body: true }));

    const response = await request(`/me/shifts/${SHIFT_ID}`, {
      token: ADMIN_TOKEN,
      method: "PUT",
      body: SHIFT,
    });

    expect(response.status).toBe(204);
    const [call] = calls;
    expect(call.method).toBe("POST");
    expect(call.url.pathname).toBe("/rest/v1/rpc/api_upsert_shift");
    expect(call.body).toEqual({
      p_id: SHIFT_ID,
      p_date: "2026-09-02",
      p_start_time: SHIFT.startTime,
      p_end_time: SHIFT.endTime,
      p_is_duty: false,
      p_user_id: ADMIN_ID,
    });
  });

  it("answers 404 when the id is another user's, without saying so", async () => {
    const { request } = await start(() => ({ status: 200, body: false }));

    const response = await request(`/me/shifts/${SHIFT_ID}`, {
      token: USER_TOKEN,
      method: "PUT",
      body: SHIFT,
    });

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      error: { code: "not_found", message: "Not found" },
    });
  });

  it("accepts a night shift that ends the next day", async () => {
    const { request } = await start(() => ({ status: 200, body: true }));
    const response = await request(`/me/shifts/${SHIFT_ID}`, {
      token: USER_TOKEN,
      method: "PUT",
      body: {
        ...SHIFT,
        startTime: "2026-09-02T22:00:00+03:00",
        endTime: "2026-09-03T06:00:00+03:00",
      },
    });
    expect(response.status).toBe(204);
  });

  it.each([
    ["not-a-uuid", SHIFT],
    [SHIFT_ID, { ...SHIFT, endTime: SHIFT.startTime }],
    [SHIFT_ID, { ...SHIFT, startTime: "2026-09-02T08:00:00" }],
    [SHIFT_ID, { ...SHIFT, date: "2026-02-30" }],
    [SHIFT_ID, { ...SHIFT, isDuty: "false" }],
    [SHIFT_ID, { ...SHIFT, userId: ADMIN_ID }],
    [SHIFT_ID, { ...SHIFT, user_id: ADMIN_ID }],
    [SHIFT_ID, { ...SHIFT, id: SHIFT_ID }],
  ])("rejects id %s with %j", async (id, body) => {
    const { request, fetch } = await start();
    const response = await request(`/me/shifts/${id}`, {
      token: USER_TOKEN,
      method: "PUT",
      body,
    });
    expect(response.status).toBe(400);
    expect(((await response.json()) as ErrorBody).error.code).toBe(
      "invalid_request",
    );
    expect(fetch).not.toHaveBeenCalled();
  });

  it("requires a token", async () => {
    const { request, fetch } = await start();
    const response = await request(`/me/shifts/${SHIFT_ID}`, {
      method: "PUT",
      body: SHIFT,
    });
    expect(response.status).toBe(401);
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe("DELETE /me/shifts/:id", () => {
  it("deletes only among the caller's shifts", async () => {
    const { request, calls } = await start(() => ({ status: 204 }));

    const response = await request(`/me/shifts/${SHIFT_ID}`, {
      token: USER_TOKEN,
      method: "DELETE",
    });

    expect(response.status).toBe(204);
    const [call] = calls;
    expect(call.method).toBe("DELETE");
    expect(call.url.pathname).toBe("/rest/v1/shifts");
    expect(call.url.searchParams.get("user_id")).toBe(`eq.${USER_ID}`);
    expect(call.url.searchParams.get("id")).toBe(`eq.${SHIFT_ID}`);
  });

  it("rejects an id that is not a uuid", async () => {
    const { request, fetch } = await start();
    const response = await request("/me/shifts/abc", {
      token: USER_TOKEN,
      method: "DELETE",
    });
    expect(response.status).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
});
