import type { Page } from "@playwright/test";

import type { HolidayItem } from "./scenario";

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
 * Makes a page deterministic: frozen clock, no analytics, and mocked calendar
 * sources (static files and the Hebcal fallback) so holiday classification
 * comes only from the scenario. The first-visit mobile menu is marked as seen
 * unless a test opts in, so it does not push content down in unrelated tests.
 */
export const prepareApp = async (
  page: Page,
  {
    holidays = [],
    firstVisit = false,
  }: { holidays?: HolidayItem[]; firstVisit?: boolean } = {},
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
};

/** Pixels the document extends past the viewport width; 0 means no horizontal page scroll. */
export const getHorizontalOverflow = (page: Page) =>
  page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
