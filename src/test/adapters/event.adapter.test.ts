import { describe, expect, it } from "vitest";
import { buildEventMap } from "@/adapters/event.adapter";
import { CalendarEventKind } from "@/domain";

const responseWith = (...items: unknown[]) => ({ items });

describe("buildEventMap", () => {
  it("returns an empty map for an empty response", () => {
    expect(buildEventMap(responseWith())).toEqual({});
  });

  it("maps a known paid holiday to the internal contract", () => {
    const result = buildEventMap(
      responseWith({
        date: "2025-04-13",
        title: "Pesach I",
        category: "holiday",
        subcat: "major",
        yomtov: true,
      }),
    );

    expect(result).toEqual({
      "2025-04-13": [
        {
          kind: CalendarEventKind.PaidHoliday,
          holidayKey: "pesach",
        },
      ],
    });
  });

  it("uses the yomtov flag for an unknown paid holiday", () => {
    const result = buildEventMap(
      responseWith({
        date: "2025-10-07",
        title: "Future Yom Tov",
        category: "holiday",
        yomtov: true,
      }),
    );

    expect(result["2025-10-07"]).toEqual([
      { kind: CalendarEventKind.PaidHoliday },
    ]);
  });

  it("normalizes apostrophes before mapping a labor-calendar exception", () => {
    const result = buildEventMap(
      responseWith({
        date: "2025-05-01T00:00:00+03:00",
        title: "Yom HaAtzma’ut",
        category: "holiday",
        subcat: "modern",
      }),
    );

    expect(result["2025-05-01"]).toEqual([
      {
        kind: CalendarEventKind.PaidHoliday,
        holidayKey: "yom_haatzmaut",
      },
    ]);
  });

  it("maps partial holiday starts without exposing the provider title", () => {
    const result = buildEventMap(
      responseWith({
        date: "2025-04-12",
        title: "Erev Pesach",
        category: "holiday",
        subcat: "major",
      }),
    );

    expect(result["2025-04-12"]).toEqual([
      {
        kind: CalendarEventKind.PartialHolidayStart,
        holidayKey: "erev_pesach",
      },
    ]);
  });

  it("normalizes repeated typographic apostrophes in provider titles", () => {
    const result = buildEventMap(
      responseWith({
        date: "2025-04-18",
        title: "Pesach VI (CH’’M)",
        category: "holiday",
        subcat: "minor",
      }),
    );

    expect(result["2025-04-18"]).toEqual([
      {
        kind: CalendarEventKind.PartialHolidayStart,
        holidayKey: "pesach_6",
      },
    ]);
  });

  it("maps Hebcal's Hoshana Raba spelling", () => {
    const result = buildEventMap(
      responseWith({
        date: "2025-10-13",
        title: "Sukkot VII (Hoshana Raba)",
        category: "holiday",
        subcat: "minor",
      }),
    );

    expect(result["2025-10-13"][0].holidayKey).toBe("hoshana_rabba");
  });

  it("supports a title suffix at the provider boundary", () => {
    const result = buildEventMap(
      responseWith({
        date: "2025-09-23",
        title: "Rosh Hashana 5786",
        category: "holiday",
        yomtov: true,
      }),
    );

    expect(result["2025-09-23"][0].holidayKey).toBe("rosh_hashana");
  });

  it.each([
    ["Rosh Hashana", CalendarEventKind.PaidHoliday, "rosh_hashana"],
    ["Rosh Hashana II", CalendarEventKind.PaidHoliday, "rosh_hashana_2"],
    ["Yom Kippur", CalendarEventKind.PaidHoliday, "yom_kippur"],
    ["Sukkot I", CalendarEventKind.PaidHoliday, "sukkot"],
    ["Shmini Atzeret", CalendarEventKind.PaidHoliday, "shmini_atzeret"],
    ["Pesach I", CalendarEventKind.PaidHoliday, "pesach"],
    ["Pesach VII", CalendarEventKind.PaidHoliday, "pesach_7"],
    ["Yom HaAtzma'ut", CalendarEventKind.PaidHoliday, "yom_haatzmaut"],
    ["Shavuot I", CalendarEventKind.PaidHoliday, "shavuot"],
    [
      "Erev Rosh Hashana",
      CalendarEventKind.PartialHolidayStart,
      "erev_rosh_hashana",
    ],
    [
      "Erev Yom Kippur",
      CalendarEventKind.PartialHolidayStart,
      "erev_yom_kippur",
    ],
    ["Erev Sukkot", CalendarEventKind.PartialHolidayStart, "erev_sukkot"],
    ["Erev Pesach", CalendarEventKind.PartialHolidayStart, "erev_pesach"],
    ["Erev Shavuot", CalendarEventKind.PartialHolidayStart, "erev_shavuot"],
    ["Yom HaZikaron", CalendarEventKind.PartialHolidayStart, "yom_hazikaron"],
    [
      "Sukkot VII (Hoshana Raba)",
      CalendarEventKind.PartialHolidayStart,
      "hoshana_rabba",
    ],
    ["Pesach VI (CH'M)", CalendarEventKind.PartialHolidayStart, "pesach_6"],
  ])("maps the provider title %s", (title, kind, holidayKey) => {
    const result = buildEventMap(
      responseWith({ date: "2025-01-01", title, category: "holiday" }),
    );

    expect(result["2025-01-01"]).toEqual([{ kind, holidayKey }]);
  });

  it("ignores unrelated and unclassified events", () => {
    const result = buildEventMap(
      responseWith(
        {
          date: "2025-04-12",
          title: "Parashat Tzav",
          category: "parashat",
        },
        {
          date: "2025-04-12",
          title: "Unknown Observance",
          category: "holiday",
          subcat: "minor",
        },
      ),
    );

    expect(result).toEqual({});
  });

  it("deduplicates equivalent events on the same date", () => {
    const item = {
      date: "2025-04-13",
      title: "Pesach I",
      category: "holiday",
      yomtov: true,
    };

    const result = buildEventMap(responseWith(item, item));

    expect(result["2025-04-13"]).toHaveLength(1);
  });

  it.each([
    [null, "items must be an array"],
    [{}, "items must be an array"],
    [{ items: {} }, "items must be an array"],
    [{ items: [null] }, "items[0] must be an object"],
    [
      responseWith({ date: "2025-01-01", title: "Event" }),
      "items[0].category must be a non-empty string",
    ],
    [
      responseWith({
        date: "2025-02-30",
        title: "Event",
        category: "holiday",
      }),
      "items[0].date is not a valid date",
    ],
    [
      responseWith({
        date: "not-a-date",
        title: "Event",
        category: "holiday",
      }),
      "items[0].date has an invalid format",
    ],
    [
      responseWith({
        date: "2025-01-01",
        title: "Event",
        category: "holiday",
        yomtov: "true",
      }),
      "items[0].yomtov must be a boolean",
    ],
    [
      responseWith({
        date: "2025-01-01",
        title: "Event",
        category: "holiday",
        subcat: 42,
      }),
      "items[0].subcat must be a string",
    ],
  ])("rejects an invalid provider payload", (payload, expectedMessage) => {
    expect(() => buildEventMap(payload)).toThrow(expectedMessage);
  });
});
