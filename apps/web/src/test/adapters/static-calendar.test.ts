import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { buildEventMap } from "@/adapters";
import { SYSTEM_START_YEAR } from "@/app/constants/ui.constant";

const CALENDAR_DIR = resolve(__dirname, "../../../public/calendar");

// Fails years before coverage runs out, not when it already has.
const REQUIRED_YEARS_AHEAD = 5;

const availableYears = readdirSync(CALENDAR_DIR)
  .map((file) => /^(\d{4})\.json$/.exec(file)?.[1])
  .filter((year): year is string => year !== undefined)
  .map(Number)
  .sort((a, b) => a - b);

describe("static calendar files", () => {
  it(`cover every selectable year and the next ${REQUIRED_YEARS_AHEAD}`, () => {
    const lastRequiredYear = new Date().getFullYear() + REQUIRED_YEARS_AHEAD;
    const missing = [];
    for (let year = SYSTEM_START_YEAR; year <= lastRequiredYear; year++) {
      if (!availableYears.includes(year)) missing.push(year);
    }
    // When this fails, extend LAST_YEAR in scripts/generate-calendar.ts and rerun it.
    expect(missing).toEqual([]);
  });

  it.each(availableYears)("%i parses into a non-empty event map", (year) => {
    const payload: unknown = JSON.parse(
      readFileSync(resolve(CALENDAR_DIR, `${year}.json`), "utf8"),
    );

    const eventMap = buildEventMap(payload);

    expect(Object.keys(eventMap).length).toBeGreaterThan(0);
    expect(
      Object.keys(eventMap).every((date) => date.startsWith(`${year}-`)),
    ).toBe(true);
  });
});
