import { describe, expect, it } from "vitest";
import { calculateElectionHours } from "../../src/calculator/election-hours.calculator.js";
import { buildPayMapPipeline } from "../../src/index.js";
import { WorkDayStatus, WorkDayType } from "../../src/constants/index.js";
import type { TimelineInterval, WorkDayMeta } from "../../src/types/types.js";

const date = "2021-03-23";
const meta: WorkDayMeta = {
  date,
  typeDay: WorkDayType.Regular,
  crossDayContinuation: false,
  knessetNumber: 24,
};
const interval = (
  start: number,
  end: number,
  calendarDate = date,
  dayOffset = 0,
): TimelineInterval => ({
  point: { start, end },
  category: "regular",
  calendarDate,
  dayOffset,
});

describe("election work premium", () => {
  it.each([
    [0, 420, 0],
    [1320, 1440, 0],
    [420, 1320, 15],
    [397, 872, 452 / 60],
    [1319, 1321, 1 / 60],
    [419, 421, 1 / 60],
  ])("clips %s–%s to the election window", (start, end, expected) => {
    expect(calculateElectionHours([interval(start, end)], meta)).toBeCloseTo(
      expected,
      10,
    );
  });

  it("ignores non-election dates, missing metadata and special intervals", () => {
    const work = interval(420, 900);
    expect(calculateElectionHours([work])).toBe(0);
    expect(
      calculateElectionHours([work], { ...meta, knessetNumber: undefined }),
    ).toBe(0);
    expect(
      calculateElectionHours([{ ...work, category: "special" }], meta),
    ).toBe(0);
    expect(
      calculateElectionHours([interval(420, 900, "2021-03-24")], meta),
    ).toBe(0);
  });

  it("uses the actual election date for a shift starting the previous day", () => {
    const previous: WorkDayMeta = {
      ...meta,
      date: "2021-03-22",
      knessetNumber: undefined,
      calendarKnessetNumbers: { [date]: 24 },
    };
    expect(
      calculateElectionHours(
        [
          interval(1200, 1440, "2021-03-22"),
          interval(1440, 1440 + 900, date, 1),
        ],
        previous,
      ),
    ).toBe(8);
  });

  it("does not extend the election window into the next date", () => {
    expect(
      calculateElectionHours(
        [interval(1200, 1440), interval(1440, 1440 + 900, "2021-03-24", 1)],
        meta,
      ),
    ).toBe(2);
  });

  it("matches the 06:37–14:32 example in both shift and day pay without inflating duration", () => {
    const pipeline = buildPayMapPipeline();
    const result = pipeline.payMap.calculateDayFromShifts({
      meta,
      month: 3,
      year: 2021,
      standardHours: 7,
      shifts: [
        {
          id: "election-example",
          start: { date: new Date(`${date}T06:37:00`) },
          end: { date: new Date(`${date}T14:32:00`) },
          isDuty: false,
        },
      ],
    });
    for (const regular of [
      result.shiftPayMaps[0].regular,
      result.dayPayMap.workMap.regular,
    ]) {
      expect(regular.hours100.hours).toBeCloseTo(7 + 452 / 60, 10);
      expect(regular.hours125.hours).toBeCloseTo(55 / 60, 10);
      expect(regular.hours150.hours).toBe(0);
    }
    expect(result.shiftPayMaps[0].totalHours).toBeCloseTo(475 / 60, 10);
    expect(result.dayPayMap.totalHours).toBeCloseTo(475 / 60, 10);
  });

  it("adds the premium once when multiple shifts are consolidated", () => {
    const result = buildPayMapPipeline().payMap.calculateDayFromShifts({
      meta,
      month: 3,
      year: 2021,
      standardHours: 7,
      shifts: [
        ["08:00", "12:00"],
        ["13:00", "19:00"],
      ].map(([start, end], index) => ({
        id: `shift-${index}`,
        start: { date: new Date(`${date}T${start}:00`) },
        end: { date: new Date(`${date}T${end}:00`) },
        isDuty: false,
      })),
    });
    expect(result.dayPayMap.workMap.regular.hours100.hours).toBe(17);
    expect(result.dayPayMap.workMap.regular.hours125.hours).toBe(2);
    expect(result.dayPayMap.workMap.regular.hours150.hours).toBe(1);
    expect(result.dayPayMap.totalHours).toBe(10);
  });

  it("pays only the election-date overlap when a real shift crosses midnight", () => {
    const result = buildPayMapPipeline().payMap.calculateDayFromShifts({
      meta: {
        ...meta,
        date: "2021-03-22",
        knessetNumber: undefined,
        calendarKnessetNumbers: { [date]: 24 },
      },
      month: 3,
      year: 2021,
      standardHours: 7,
      shifts: [
        {
          id: "before-election",
          start: { date: new Date("2021-03-22T23:00:00") },
          end: { date: new Date("2021-03-23T08:00:00") },
          isDuty: false,
        },
      ],
    });
    expect(result.shiftPayMaps[0].regular.hours100.hours).toBe(8);
    expect(result.dayPayMap.workMap.regular.hours100.hours).toBe(8);
    expect(result.dayPayMap.workMap.regular.hours125.hours).toBe(2);
    expect(result.dayPayMap.totalHours).toBe(9);
  });

  it.each([WorkDayStatus.sick, WorkDayStatus.vacation])(
    "does not add election pay for absence status %s",
    (status) => {
      const result = buildPayMapPipeline().payMap.calculateDayFromShifts({
        meta,
        month: 3,
        year: 2021,
        standardHours: 7,
        status,
        shifts: [],
      });
      expect(result.dayPayMap.workMap.regular.hours100.hours).toBe(0);
    },
  );
});
