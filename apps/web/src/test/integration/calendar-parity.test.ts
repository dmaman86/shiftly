import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import type { CalendarEvent, CalendarEventMap } from "@shiftly/domain";
import { CalendarEventKind } from "@shiftly/domain";
import { domain } from "@/app";
import { buildEventMap } from "@/adapters";
import { buildCalendarEventMap } from "@/hooks/useWorkDays";
import type { PublishedElection } from "@/services";

/**
 * Before the legacy calendar files are removed, the new sources must give the
 * same salary-relevant calendar for every year those files cover:
 *   1. jewish-date holidays = the holidays in public/calendar/{year}.json
 *   2. published elections (the frozen API fixture shared with E2E) = the
 *      election days in those files, by date and Knesset number
 *   3. the resulting WorkDayMeta, for every day of every month.
 */

const calendarDir = resolve(import.meta.dirname, "../../../public/calendar");
const readJson = <T>(path: string): T =>
  JSON.parse(readFileSync(path, "utf8")) as T;

const legacyYears = readdirSync(calendarDir)
  .map((file) => /^(\d{4})\.json$/.exec(file)?.[1])
  .filter((year): year is string => year !== undefined)
  .map(Number)
  .sort((a, b) => a - b);

const publishedElections = readJson<{ elections: PublishedElection[] }>(
  resolve(
    import.meta.dirname,
    "../../../../../e2e/fixtures/published-elections.json",
  ),
).elections;

type CalendarItem = {
  date: string;
  category: string;
  subcat?: string;
  knessetNumber?: number;
};
const legacyItems = (year: number) =>
  readJson<{ items: CalendarItem[] }>(resolve(calendarDir, `${year}.json`));

const isElection = (event: CalendarEvent) =>
  event.kind === CalendarEventKind.KnessetElectionDay;

/** Same events per date, regardless of their order within the date. */
const normalized = (
  eventMap: CalendarEventMap,
  keep: (event: CalendarEvent) => boolean = () => true,
) =>
  Object.fromEntries(
    Object.entries(eventMap)
      .map(([date, events]) => [
        date,
        events
          .filter(keep)
          .map((event) => JSON.stringify(event))
          .sort(),
      ])
      .filter(([, events]) => events.length > 0)
      .sort(([a], [b]) => String(a).localeCompare(String(b))),
  );

const publishedIn = (year: number) => ({
  status: "fresh" as const,
  year,
  elections: publishedElections.filter(({ date }) =>
    date.startsWith(`${year}-`),
  ),
});

/** What the app built before: the static files of every year in range. */
const legacyEventMap = (years: number[]): CalendarEventMap =>
  Object.assign({}, ...years.map((year) => buildEventMap(legacyItems(year))));

/** A December range also reads the next year's file. */
const yearsOfMonth = (year: number, month: number) =>
  month === 12 ? [year, year + 1] : [year];

/**
 * Months whose legacy reference is incomplete: the app used Hebcal, not the
 * files, when a year in range had no file. Only December 2040 (needs 2041).
 */
const monthsWithoutLegacyReference = legacyYears.flatMap((year) =>
  Array.from({ length: 12 }, (_, index) => index + 1)
    .filter((month) =>
      yearsOfMonth(year, month).some((y) => !legacyYears.includes(y)),
    )
    .map((month) => `${year}-${month}`),
);

describe("the computed calendar matches the legacy calendar files", () => {
  it("covers every legacy year, 2015 to 2040", () => {
    expect(legacyYears[0]).toBe(2015);
    expect(legacyYears[legacyYears.length - 1]).toBe(2040);
    expect(legacyYears).toHaveLength(26);
  });

  it("compares every month except December 2040, which needs 2041", () => {
    expect(monthsWithoutLegacyReference).toEqual(["2040-12"]);
  });

  it("has every published election in a legacy year", () => {
    for (const { date } of publishedElections) {
      expect(legacyYears).toContain(Number(date.slice(0, 4)));
    }
  });

  describe.each(legacyYears)("%i", (year) => {
    const legacy = buildEventMap(legacyItems(year));
    const computed = buildCalendarEventMap([year], [publishedIn(year)]);

    it("has the same holidays", () => {
      const notElection = (event: CalendarEvent) => !isElection(event);
      expect(normalized(computed, notElection)).toEqual(
        normalized(legacy, notElection),
      );
    });

    it("has the same election days, by date and Knesset number", () => {
      expect(normalized(computed, isElection)).toEqual(
        normalized(legacy, isElection),
      );
    });

    it("produces the same WorkDayMeta for every day of every month", () => {
      for (let month = 1; month <= 12; month++) {
        if (monthsWithoutLegacyReference.includes(`${year}-${month}`)) continue;
        const years = yearsOfMonth(year, month);
        const build = (eventMap: CalendarEventMap) =>
          domain.payMap.workDaysMonthBuilder
            .build({ year, month, eventMap })
            .map((day) => day.meta);
        const now = buildCalendarEventMap(years, years.map(publishedIn));
        expect(build(now), `${year}-${month}`).toEqual(
          build(legacyEventMap(years)),
        );
      }
    });
  });
});
