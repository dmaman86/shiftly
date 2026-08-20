import { beforeEach, describe, expect, it } from "vitest";
import { HolidayResolverService } from "@/domain/resolve/holiday.resolver";
import { CalendarEventKind } from "@/domain";
import { Weekend, WorkDayType } from "@/constants";

describe("HolidayResolverService", () => {
  let resolver: HolidayResolverService;

  beforeEach(() => {
    resolver = new HolidayResolverService();
  });

  it("marks a paid holiday as a full special day", () => {
    expect(
      resolver.resolve({
        weekday: 2,
        events: [{ kind: CalendarEventKind.PaidHoliday }],
      }),
    ).toBe(WorkDayType.SpecialFull);
  });

  it("marks a partial holiday start as a partial special day", () => {
    expect(
      resolver.resolve({
        weekday: 2,
        events: [{ kind: CalendarEventKind.PartialHolidayStart }],
      }),
    ).toBe(WorkDayType.SpecialPartialStart);
  });

  it("marks Saturday as a full special day without events", () => {
    expect(
      resolver.resolve({ weekday: Weekend.SATURDAY, events: [] }),
    ).toBe(WorkDayType.SpecialFull);
  });

  it("marks Friday as a partial special day without events", () => {
    expect(resolver.resolve({ weekday: Weekend.FRIDAY, events: [] })).toBe(
      WorkDayType.SpecialPartialStart,
    );
  });

  it("prioritizes a paid holiday over Friday", () => {
    expect(
      resolver.resolve({
        weekday: Weekend.FRIDAY,
        events: [{ kind: CalendarEventKind.PaidHoliday }],
      }),
    ).toBe(WorkDayType.SpecialFull);
  });

  it("marks an ordinary weekday as regular", () => {
    expect(resolver.resolve({ weekday: 3, events: [] })).toBe(
      WorkDayType.Regular,
    );
  });

  it("ignores presentation metadata when resolving the day type", () => {
    expect(
      resolver.resolve({
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
