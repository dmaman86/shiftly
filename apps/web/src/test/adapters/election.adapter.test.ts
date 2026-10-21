import { describe, expect, it } from "vitest";
import { CalendarEventKind } from "@shiftly/domain";
import { replaceElectionDays } from "@/adapters";

const election = (knessetNumber: number) => ({
  kind: CalendarEventKind.KnessetElectionDay,
  knessetNumber,
});
const yomKippur = {
  kind: CalendarEventKind.PaidHoliday,
  holidayKey: "yom_kippur" as const,
};

describe("replaceElectionDays", () => {
  it("replaces the year's legacy election days with the published ones", () => {
    const legacy = { "2026-09-21": [yomKippur], "2026-10-27": [election(26)] };

    expect(
      replaceElectionDays(legacy, 2026, [
        { knessetNumber: 26, date: "2026-11-03", status: "confirmed" },
      ]),
    ).toEqual({ "2026-09-21": [yomKippur], "2026-11-03": [election(26)] });
  });

  it("removes legacy election days when the API publishes none", () => {
    expect(
      replaceElectionDays({ "2026-10-27": [election(26)] }, 2026, []),
    ).toEqual({});
  });

  it("keeps other events on an election day and leaves other years alone", () => {
    const legacy = {
      "2026-10-27": [yomKippur, election(26)],
      "2027-01-01": [election(27)],
    };
    expect(replaceElectionDays(legacy, 2026, [])).toEqual({
      "2026-10-27": [yomKippur],
      "2027-01-01": [election(27)],
    });
  });

  it("ignores published elections outside the year and does not mutate its input", () => {
    const legacy = { "2026-10-27": [election(26)] };
    const result = replaceElectionDays(legacy, 2026, [
      { knessetNumber: 26, date: "2026-10-27", status: "planned" },
      { knessetNumber: 27, date: "2027-03-01", status: "planned" },
    ]);
    expect(result).toEqual({ "2026-10-27": [election(26)] });
    expect(legacy).toEqual({ "2026-10-27": [election(26)] });
  });
});
