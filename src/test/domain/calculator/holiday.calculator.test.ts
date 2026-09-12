import { beforeEach, describe, expect, it } from "vitest";
import { DefaultHolidayCalculator } from "@/domain/calculator/holiday.calculator";
import { CalendarEventKind } from "@/domain";
import { Weekend, WorkDayType } from "@/constants";

describe("DefaultHolidayCalculator", () => {
  let calculator: DefaultHolidayCalculator;

  beforeEach(() => {
    calculator = new DefaultHolidayCalculator();
  });

  it("marks a paid holiday as a full special day", () => {
    expect(
      calculator.calculate({
        weekday: 2,
        events: [{ kind: CalendarEventKind.PaidHoliday }],
      }),
    ).toBe(WorkDayType.SpecialFull);
  });

  it("marks a partial holiday start as a partial special day", () => {
    expect(
      calculator.calculate({
        weekday: 2,
        events: [{ kind: CalendarEventKind.PartialHolidayStart }],
      }),
    ).toBe(WorkDayType.SpecialPartialStart);
  });

  it("marks Saturday as a full special day without events", () => {
    expect(
      calculator.calculate({ weekday: Weekend.SATURDAY, events: [] }),
    ).toBe(WorkDayType.SpecialFull);
  });

  it("marks Friday as a partial special day without events", () => {
    expect(calculator.calculate({ weekday: Weekend.FRIDAY, events: [] })).toBe(
      WorkDayType.SpecialPartialStart,
    );
  });

  it("prioritizes a paid holiday over Friday", () => {
    expect(
      calculator.calculate({
        weekday: Weekend.FRIDAY,
        events: [{ kind: CalendarEventKind.PaidHoliday }],
      }),
    ).toBe(WorkDayType.SpecialFull);
  });

  it("marks an ordinary weekday as regular", () => {
    expect(calculator.calculate({ weekday: 3, events: [] })).toBe(
      WorkDayType.Regular,
    );
  });

  it("ignores presentation metadata when resolving the day type", () => {
    expect(
      calculator.calculate({
        weekday: 3,
        events: [
          {
            kind: CalendarEventKind.PartialHolidayStart,
            holidayKey: "erev_pesach",
          },
        ],
      }),
    ).toBe(WorkDayType.SpecialPartialStart);
  });
});
