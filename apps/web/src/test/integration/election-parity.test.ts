import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { domain } from "@/app";
import { buildEventMap, replaceElectionDays } from "@/adapters";
import type { PublishedElection } from "@/services";

/**
 * Before the static election source is removed, published election days must
 * reproduce today's calendar exactly. The published data was seeded from
 * scripts/data/knesset-elections.json, so every legacy calendar year is
 * checked against it: same identity (date, Knesset number), same event map,
 * same WorkDayMeta. Status has no legacy counterpart and is not compared.
 */

const calendarDir = resolve(import.meta.dirname, "../../../public/calendar");
const seedSource = resolve(
  import.meta.dirname,
  "../../../../../scripts/data/knesset-elections.json",
);

const readJson = (path: string): unknown =>
  JSON.parse(readFileSync(path, "utf8"));

const legacyYears = readdirSync(calendarDir)
  .map((file) => /^(\d{4})\.json$/.exec(file)?.[1])
  .filter((year): year is string => year !== undefined)
  .map(Number)
  .sort((a, b) => a - b);

const seededElections = (
  readJson(seedSource) as {
    elections: { knessetNumber: number; date: string }[];
  }
).elections;

const publishedIn = (year: number): PublishedElection[] =>
  seededElections
    .filter(({ date }) => date.startsWith(`${year}-`))
    .map(({ knessetNumber, date }) => ({
      knessetNumber,
      date,
      status: "occurred",
    }));

type CalendarItem = {
  date: string;
  category: string;
  subcat?: string;
  knessetNumber?: number;
};

const legacyElectionsIn = (calendar: { items: CalendarItem[] }) =>
  calendar.items
    .filter((item) => item.category === "election" && item.subcat === "knesset")
    .map(({ date, knessetNumber }) => ({ date, knessetNumber }));

describe("published election days match the legacy calendar", () => {
  it("covers every legacy calendar year", () => {
    expect(legacyYears[0]).toBe(2015);
    expect(legacyYears.length).toBeGreaterThanOrEqual(26);
  });

  it.each(legacyYears)("%i", (year) => {
    const calendar = readJson(resolve(calendarDir, `${year}.json`)) as {
      items: CalendarItem[];
    };
    const published = publishedIn(year);

    // Same identity: date and Knesset number.
    expect(
      published.map(({ date, knessetNumber }) => ({ date, knessetNumber })),
    ).toEqual(legacyElectionsIn(calendar));

    // Same event map once the published days replace the legacy ones.
    const legacyEventMap = buildEventMap(calendar);
    const eventMap = replaceElectionDays(legacyEventMap, year, published);
    expect(eventMap).toEqual(legacyEventMap);

    // Same WorkDayMeta, which drives the election-day premium.
    for (const { date } of published) {
      const month = Number(date.slice(5, 7));
      const build = (map: typeof eventMap) =>
        domain.payMap.workDaysMonthBuilder
          .build({ year, month, eventMap: map })
          .map((day) => day.meta);
      expect(build(eventMap)).toEqual(build(legacyEventMap));
    }
  });
});
