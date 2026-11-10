import type { Page, Request, Route } from "@playwright/test";

import { FIXED_NOW } from "./app";

/** A fictional signed-in user; nothing here is a real account. */
export const E2E_USER = {
  id: "00000000-0000-4000-8000-0000000000e2",
  email: "e2e.user@example.test",
  fullName: "E2E User",
};

const E2E_ACCESS_TOKEN = "e2e-access-token";

/**
 * Signs the page in without Supabase: the browser finds a stored session
 * when the app starts. The build decides the project URL, and with it the
 * storage key (sb-<project ref>-auth-token), so every such key answers with
 * the session instead of the test guessing the ref. Valid for a year after
 * the frozen clock, so nothing tries to refresh it.
 */
export const signIn = async (page: Page) => {
  const nowSeconds = Math.floor(FIXED_NOW.getTime() / 1000);
  const session = {
    access_token: E2E_ACCESS_TOKEN,
    token_type: "bearer",
    expires_in: 365 * 24 * 60 * 60,
    expires_at: nowSeconds + 365 * 24 * 60 * 60,
    refresh_token: "e2e-refresh-token",
    user: {
      id: E2E_USER.id,
      aud: "authenticated",
      role: "authenticated",
      email: E2E_USER.email,
      app_metadata: { provider: "google", providers: ["google"] },
      user_metadata: { full_name: E2E_USER.fullName },
      created_at: "2026-01-01T00:00:00Z",
    },
  };

  await page.addInitScript((stored) => {
    const getItem = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key: string) {
      return /^sb-.+-auth-token$/.test(key) ? stored : getItem.call(this, key);
    };
  }, JSON.stringify(session));

  // Auth traffic stays allowed; answer it here so it never leaves the test.
  await page.route(/\/auth\/v1\//, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        new URL(route.request().url()).pathname.endsWith("/user")
          ? session.user
          : session,
      ),
    }),
  );
};

/** Supabase application-data paths: REST tables, RPCs, Edge Functions, Storage. */
const SUPABASE_DATA_PATH = /\/(rest|functions|storage|graphql)\/v1\//;

/**
 * Application data the web app still reads and writes directly in Supabase.
 * Temporary, like the lint allowlist: each entry goes away as its data moves
 * to apps/api, and the list must end empty.
 */
const LEGACY_SUPABASE_DATA = [
  "/rest/v1/rpc/import_guest_month",
  "/functions/v1/delete-account",
];

const isLegacy = (request: Request) => {
  const { pathname } = new URL(request.url());
  return LEGACY_SUPABASE_DATA.some((path) => pathname.endsWith(path));
};

/**
 * Records every request for application data in Supabase. Legacy paths are
 * answered empty (writes are accepted and dropped); anything else is aborted
 * and reported, so new direct data access fails the test.
 */
export const watchSupabaseData = async (page: Page) => {
  const requests: Request[] = [];
  page.on("request", (request) => {
    if (SUPABASE_DATA_PATH.test(new URL(request.url()).pathname)) {
      requests.push(request);
    }
  });

  const fulfillLegacy = (route: Route) => {
    const request = route.request();
    if (request.method() !== "GET") {
      return route.fulfill({ status: request.method() === "POST" ? 201 : 204 });
    }
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: "[]",
    });
  };

  await page.route(SUPABASE_DATA_PATH, (route) =>
    isLegacy(route.request()) ? fulfillLegacy(route) : route.abort(),
  );

  return {
    /** Paths outside the legacy list: must stay empty. */
    unexpected: () =>
      requests
        .filter((request) => !isLegacy(request))
        .map(
          (request) => `${request.method()} ${new URL(request.url()).pathname}`,
        ),
    /** Every application-data request made directly to Supabase. */
    all: () =>
      requests.map(
        (request) => `${request.method()} ${new URL(request.url()).pathname}`,
      ),
  };
};

/** A month's settings as apps/api returns them. */
export type MonthlyConfig = {
  year: number;
  month: number;
  standardHours: number;
  baseRate: number;
  unusedShabbatCreditHours: number;
};

/** A marked day as apps/api returns it. */
export type WorkDay = { date: string; status: "vacation" | "sick" };

/** A shift as apps/api returns it. */
export type Shift = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isDuty: boolean;
};

/** The build may embed the production API URL (VITE_API_URL): match any host. */
const USER_DATA_ROUTE = /\/me\/(months|work-days|shifts)\//;
const MONTH_READ = /\/me\/months\/(\d+)\/(\d+)\/(config|work-days|shifts)$/;

const inMonth = (date: string, year: number, month: number) =>
  date.startsWith(`${year}-${String(month).padStart(2, "0")}-`);

/**
 * Answers the signed-in user's data endpoints of apps/api: reads from the
 * given rows, writes accepted and dropped. A request without the E2E
 * session's token gets the API's 401, as it would in production.
 */
export const serveUserData = async (
  page: Page,
  {
    monthlyConfigs = [],
    workDays = [],
    shifts = [],
  }: {
    monthlyConfigs?: MonthlyConfig[];
    workDays?: WorkDay[];
    shifts?: Shift[];
  } = {},
) => {
  const requests: string[] = [];

  const readMonth = (pathname: string) => {
    const [, rawYear, rawMonth, resource] = MONTH_READ.exec(pathname) ?? [];
    const year = Number(rawYear);
    const month = Number(rawMonth);
    if (resource === "work-days") {
      return {
        workDays: workDays.filter((day) => inMonth(day.date, year, month)),
      };
    }
    if (resource === "shifts") {
      return {
        shifts: shifts.filter((shift) => inMonth(shift.date, year, month)),
      };
    }
    const saved = monthlyConfigs.find(
      (config) => config.year === year && config.month === month,
    );
    return {
      config: saved
        ? {
            standardHours: saved.standardHours,
            baseRate: saved.baseRate,
            unusedShabbatCreditHours: saved.unusedShabbatCreditHours,
          }
        : null,
    };
  };

  await page.route(USER_DATA_ROUTE, (route) => {
    const request = route.request();
    const { pathname } = new URL(request.url());
    requests.push(`${request.method()} ${pathname}`);
    if (request.headers()["authorization"] !== `Bearer ${E2E_ACCESS_TOKEN}`) {
      return route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "unauthenticated", message: "Sign in required" },
        }),
      });
    }
    if (request.method() !== "GET") return route.fulfill({ status: 204 });
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(readMonth(pathname)),
    });
  });

  return {
    /** Every request to the user-data endpoints, as "METHOD /path". */
    all: () => [...requests],
  };
};
