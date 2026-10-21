import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import { buildHolidayEventMap } from "@/adapters/holiday.adapter";
import { israeliHolidaysBetween } from "@/services/calendar/israeliHolidays";
import { CalendarEventKind, type CalendarEventMap } from "@shiftly/domain";

interface HolidayOracle {
  firstYear: number;
  lastYear: number;
  events: Record<string, Record<string, string[]>>;
}

// Classification of the former Hebcal-generated calendar files; see the
// fixture's "source" field.
const oracle: HolidayOracle = JSON.parse(
  readFileSync(
    resolve(import.meta.dirname, "../fixtures/israeli-holidays-2015-2040.json"),
    "utf8",
  ),
);

const expectedEventMap = (): CalendarEventMap => {
  const eventMap: CalendarEventMap = {};
  for (const [kind, byKey] of Object.entries(oracle.events)) {
    for (const [holidayKey, dates] of Object.entries(byKey)) {
      for (const date of dates) {
        (eventMap[date] ??= []).push({
          kind: kind as CalendarEventKind,
          holidayKey: holidayKey as never,
        });
      }
    }
  }
  return eventMap;
};

describe("buildHolidayEventMap", () => {
  it("classifies every year exactly as the former Hebcal calendar", () => {
    const facts = israeliHolidaysBetween(
      `${oracle.firstYear}-01-01`,
      `${oracle.lastYear}-12-31`,
    );

    const actual = buildHolidayEventMap(facts);

    expect(Object.keys(actual).sort()).toEqual(
      Object.keys(expectedEventMap()).sort(),
    );
    expect(actual).toEqual(expectedEventMap());
  });

  it("maps paid and partial holidays to the internal contract", () => {
    expect(
      buildHolidayEventMap([
        { date: "2025-06-01", holiday: "erev_shavuot" },
        { date: "2025-06-02", holiday: "shavuot" },
      ]),
    ).toEqual({
      "2025-06-01": [
        {
          kind: CalendarEventKind.PartialHolidayStart,
          holidayKey: "erev_shavuot",
        },
      ],
      "2025-06-02": [
        { kind: CalendarEventKind.PaidHoliday, holidayKey: "shavuot" },
      ],
    });
  });

  it("returns independent event objects", () => {
    const eventMap = buildHolidayEventMap([
      { date: "2025-04-13", holiday: "pesach" },
      { date: "2026-04-02", holiday: "pesach" },
    ]);
    eventMap["2025-04-13"][0].knessetNumber = 26;
    expect(eventMap["2026-04-02"][0].knessetNumber).toBeUndefined();
  });
});
