import { describe, expect, it } from "vitest";
import { DateService } from "../../src/services/date.service.js";
import { ShiftService } from "../../src/services/shift.service.js";

const dates = new DateService();
const shifts = new ShiftService(dates);

describe("wall-clock payroll duration", () => {
  it.each([
    ["spring", "2025-03-27T22:00:00+02:00", "2025-03-28T06:00:00+03:00", 7],
    ["autumn", "2025-10-25T22:00:00+03:00", "2025-10-26T06:00:00+02:00", 9],
    ["ordinary", "2025-01-16T22:00:00+02:00", "2025-01-17T06:00:00+02:00", 8],
  ])(
    "pays eight clock hours on an %s overnight shift",
    (_name, start, end, elapsed) => {
      const shift = {
        id: "clock-contract",
        start: { date: dates.createDateFromPersisted(start) },
        end: { date: dates.createDateFromPersisted(end) },
        isDuty: false,
      };
      expect(shifts.getDurationShift(shift)).toBe(8);
      expect(
        (new Date(end).getTime() - new Date(start).getTime()) / 3_600_000,
      ).toBe(elapsed);
    },
  );

  it("documents that repeated wall-clock fields do not preserve offset identity", () => {
    const first = dates.createDateFromPersisted("2025-10-26T01:30:00+03:00");
    const second = dates.createDateFromPersisted("2025-10-26T01:30:00+02:00");
    expect(first.getHours()).toBe(1);
    expect(second.getHours()).toBe(1);
    expect(first.getMinutes()).toBe(second.getMinutes());
    expect(
      shifts.getDurationShift({
        id: "repeated-clock",
        start: { date: first },
        end: { date: second },
        isDuty: false,
      }),
    ).toBe(0);
  });
});
