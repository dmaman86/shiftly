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
  "/rest/v1/monthly_configs",
  "/rest/v1/work_days",
  "/rest/v1/shifts",
  "/rest/v1/rpc/import_guest_month",
  "/functions/v1/delete-account",
];

const isLegacy = (request: Request) => {
  const { pathname } = new URL(request.url());
  return LEGACY_SUPABASE_DATA.some((path) => pathname.endsWith(path));
};

export type MonthlyConfigRow = {
  year: number;
  month: number;
  standard_hours: number;
  base_rate: number;
  unused_shabbat_credit_hours: number;
};

/**
 * Records every request for application data in Supabase. Legacy paths are
 * answered from the given rows (writes are accepted and dropped); anything
 * else is aborted and reported, so new direct data access fails the test.
 */
export const watchSupabaseData = async (
  page: Page,
  { monthlyConfigs = [] }: { monthlyConfigs?: MonthlyConfigRow[] } = {},
) => {
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
    const url = new URL(request.url());
    const rows = url.pathname.endsWith("/monthly_configs")
      ? monthlyConfigs.filter(
          (row) =>
            url.searchParams.get("year") === `eq.${row.year}` &&
            url.searchParams.get("month") === `eq.${row.month}`,
        )
      : [];
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(rows),
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
