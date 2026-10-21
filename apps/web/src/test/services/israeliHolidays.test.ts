import { describe, expect, it } from "vitest";

import { israeliHolidaysBetween } from "@/services/calendar/israeliHolidays";

const holidayOn = (date: string) =>
  israeliHolidaysBetween(date, date).map((fact) => fact.holiday);

describe("israeliHolidaysBetween", () => {
  it.each([
    ["5 Iyar on Wednesday stays", "2020-04-28", "2020-04-29"],
    ["5 Iyar on Friday moves to Thursday", "2015-04-22", "2015-04-23"],
    ["5 Iyar on Saturday moves to Thursday", "2025-04-30", "2025-05-01"],
    ["5 Iyar on Monday moves to Tuesday", "2024-05-13", "2024-05-14"],
  ])("Yom HaAtzmaut: %s", (_case, zikaron, atzmaut) => {
    expect(holidayOn(zikaron)).toEqual(["yom_hazikaron"]);
    expect(holidayOn(atzmaut)).toEqual(["yom_haatzmaut"]);
  });

  it("observes a single festival day, as in Israel", () => {
    expect(israeliHolidaysBetween("2025-04-12", "2025-04-14")).toEqual([
      { date: "2025-04-12", holiday: "erev_pesach" },
      { date: "2025-04-13", holiday: "pesach" },
    ]);
    expect(holidayOn("2025-06-02")).toEqual(["shavuot"]);
    expect(holidayOn("2025-06-03")).toEqual([]);
  });

  it("includes both ends of the range and returns facts in date order", () => {
    const facts = israeliHolidaysBetween("2025-09-22", "2025-10-14");
    expect(facts.map((fact) => fact.date)).toEqual([
      "2025-09-22",
      "2025-09-23",
      "2025-09-24",
      "2025-10-01",
      "2025-10-02",
      "2025-10-06",
      "2025-10-07",
      "2025-10-13",
      "2025-10-14",
    ]);
  });

  it("does not mark minor observances such as Rosh Hashana LaBehemot (1 Elul)", () => {
    expect(holidayOn("2026-08-14")).toEqual([]);
  });

  it("returns nothing for an empty range", () => {
    expect(israeliHolidaysBetween("2025-04-14", "2025-04-12")).toEqual([]);
  });

  it.each(["2025-4-13", "2025-02-30", "not-a-date"])(
    "rejects the invalid date %s",
    (date) => {
      expect(() => israeliHolidaysBetween(date, "2025-12-31")).toThrow(
        "Invalid date",
      );
    },
  );
});
