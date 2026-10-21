import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Page } from "@playwright/test";

import type { CalendarItem } from "./scenario";

export type PublishedElection = {
  knessetNumber: number;
  date: string;
  status: "planned" | "confirmed" | "occurred";
};

/** Frozen published elections; tests never reach the real API. */
export const PUBLISHED_ELECTIONS: readonly PublishedElection[] = (
  JSON.parse(
    readFileSync(resolve("e2e/fixtures/published-elections.json"), "utf8"),
  ) as { elections: PublishedElection[] }
).elections;

export type PublishedTimelines = Record<
  "per_diem.point_rate" | "meal_allowance.rates",
  { validFrom: string; validTo: string | null; value: unknown }[]
>;

/** Frozen published rates, equal to the app's embedded baseline. */
export const PUBLISHED_TIMELINES: PublishedTimelines = (
  JSON.parse(
    readFileSync(resolve("e2e/fixtures/reference-timelines.json"), "utf8"),
  ) as { timelines: PublishedTimelines }
).timelines;

/** The build may embed the production API URL (VITE_API_URL): match any host. */
export const ELECTIONS_ROUTE = "**/reference/elections?*";
export const TIMELINES_ROUTE = "**/reference/timelines?*";

/**
 * "Today" for every E2E test. The app defaults to the current month and caps
 * the pickers at it, so a fixed clock keeps scenarios stable as time passes.
 */
export const FIXED_NOW = new Date("2026-09-15T10:00:00+03:00");

const ANALYTICS_HOSTS =
  /https:\/\/(www\.googletagmanager\.com|www\.google-analytics\.com|analytics\.google\.com|stats\.g\.doubleclick\.net)\//;

/** Mirrors the app's storage key; E2E stays black-box, so it is not imported. */
const NAV_MENU_INTRO_KEY = "shiftly:nav-menu-intro-seen";

/**
 * Makes a page deterministic: frozen clock, no analytics, and election days
 * and rate timelines from frozen fixtures instead of the API. Holidays are computed in the
 * browser, so `holidays` no longer changes what the app shows: it only feeds
 * the disconnected legacy calendar routes, which go away with them. The first-visit mobile menu is marked as seen
 * unless a test opts in, so it does not push content down in unrelated tests.
 */
export const prepareApp = async (
  page: Page,
  {
    holidays = [],
    elections = PUBLISHED_ELECTIONS,
    timelines = PUBLISHED_TIMELINES,
    firstVisit = false,
  }: {
    holidays?: CalendarItem[];
    elections?: readonly PublishedElection[];
    timelines?: PublishedTimelines;
    firstVisit?: boolean;
  } = {},
) => {
  const fulfillHolidays: Parameters<Page["route"]>[1] = (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: holidays }),
    });

  if (!firstVisit) {
    await page.addInitScript(
      (key) => window.localStorage.setItem(key, "1"),
      NAV_MENU_INTRO_KEY,
    );
  }
  await page.clock.setFixedTime(FIXED_NOW);
  await page.route(ANALYTICS_HOSTS, (route) => route.abort());
  await page.route("**/calendar/*.json", fulfillHolidays);
  await page.route("https://www.hebcal.com/hebcal/**", fulfillHolidays);
  // Any other request to a deployed API fails loudly instead of leaking out.
  // Registered first: Playwright tries the most recently added route first.
  await page.route(/^https:\/\/[^/]+\.run\.app\//, (route) => route.abort());
  await page.route(ELECTIONS_ROUTE, (route) => {
    const year = Number(
      new URL(route.request().url()).searchParams.get("year"),
    );
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        year,
        elections: elections.filter(({ date }) => date.startsWith(`${year}-`)),
      }),
    });
  });
  await page.route(TIMELINES_ROUTE, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ timelines }),
    }),
  );
};

/** Pixels the document extends past the viewport width; 0 means no horizontal page scroll. */
export const getHorizontalOverflow = (page: Page) =>
  page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
