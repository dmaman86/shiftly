import { WorkDayStatus, WorkDayType } from "../../src/constants/index.js";
import { buildPayMapPipeline, Shift, WorkDayMap } from "../../src/index.js";

// Every paid hour of a day lands in exactly one bucket: a worked-hour tier
// (regular 100/125/150 or Shabbat 150/200), sick or vacation. `extra` is
// excluded on purpose: those are surcharges on hours already counted above.
const pipeline = buildPayMapPipeline();
const PRECISION = 9;

// The application default plus a non-default threshold, since standard hours
// are configuration rather than a contract constant.
const STANDARD_HOURS_CONFIGS = [6.67, 8.4];

const at = (day: number, hour: number, minute = 0) =>
  new Date(2026, 8, day, hour, minute);

const shift = (start: Date, end: Date, isDuty = false): Shift => ({
  id: crypto.randomUUID(),
  start: { date: start },
  end: { date: end },
  isDuty,
});

const workedHours = ({ workMap: { regular, special } }: WorkDayMap) =>
  regular.hours100.hours +
  regular.hours125.hours +
  regular.hours150.hours +
  special.shabbat150.hours +
  special.shabbat200.hours;

const buildDay = (params: {
  date: string;
  typeDay: WorkDayType;
  shifts: Shift[];
  standardHours: number;
  status?: WorkDayStatus;
}) =>
  pipeline.payMap.calculateDayFromShifts({
    meta: {
      date: params.date,
      typeDay: params.typeDay,
      crossDayContinuation: false,
    },
    month: 9,
    year: 2026,
    standardHours: params.standardHours,
    shifts: params.shifts,
    status: params.status,
  }).dayPayMap;

describe.each(STANDARD_HOURS_CONFIGS)(
  "day hour decomposition with %s standard hours",
  (standardHours) => {
    it.each([
      {
        name: "short regular shift",
        date: "2026-09-15",
        typeDay: WorkDayType.Regular,
        shifts: [shift(at(15, 8), at(15, 9, 51))],
      },
      {
        name: "regular shift with 125% and 150% overtime",
        date: "2026-09-15",
        typeDay: WorkDayType.Regular,
        shifts: [shift(at(15, 7), at(15, 19))],
      },
      {
        name: "night shift crossing midnight",
        date: "2026-09-15",
        typeDay: WorkDayType.Regular,
        shifts: [shift(at(15, 22), at(16, 8))],
      },
      {
        name: "two shifts on the same day",
        date: "2026-09-15",
        typeDay: WorkDayType.Regular,
        shifts: [shift(at(15, 6), at(15, 12)), shift(at(15, 14), at(15, 22))],
      },
      {
        name: "Friday shift running into Shabbat",
        date: "2026-09-18",
        typeDay: WorkDayType.SpecialPartialStart,
        shifts: [shift(at(18, 10), at(19, 2))],
      },
      {
        name: "full Shabbat shift",
        date: "2026-09-19",
        typeDay: WorkDayType.SpecialFull,
        shifts: [shift(at(19, 7), at(19, 19))],
      },
      {
        name: "Shabbat shift running into Sunday",
        date: "2026-09-19",
        typeDay: WorkDayType.SpecialFull,
        shifts: [shift(at(19, 14), at(20, 6))],
      },
      {
        name: "24h duty shift",
        date: "2026-09-15",
        typeDay: WorkDayType.Regular,
        shifts: [shift(at(15, 8), at(16, 8), true)],
      },
    ])("worked tiers add up to the day total: $name", (params) => {
      const day = buildDay({ ...params, standardHours });

      expect(day.totalHours).toBeGreaterThan(0);
      expect(workedHours(day)).toBeCloseTo(day.totalHours, PRECISION);
      expect(day.workMap.totalHours).toBeCloseTo(day.totalHours, PRECISION);
      expect(day.hours100Sick.hours).toBe(0);
      expect(day.hours100Vacation.hours).toBe(0);
    });

    it.each([
      { status: WorkDayStatus.sick, segment: "hours100Sick" },
      { status: WorkDayStatus.vacation, segment: "hours100Vacation" },
    ] as const)(
      "a $status day pays the standard hours without worked tiers",
      ({ status, segment }) => {
        const day = buildDay({
          date: "2026-09-15",
          typeDay: WorkDayType.Regular,
          shifts: [],
          standardHours,
          status,
        });

        expect(day.totalHours).toBe(standardHours);
        expect(workedHours(day)).toBe(0);
        expect(day[segment].hours).toBe(standardHours);
        expect(
          workedHours(day) +
            day.hours100Sick.hours +
            day.hours100Vacation.hours,
        ).toBeCloseTo(day.totalHours, PRECISION);
      },
    );

    it("an empty working day has no hours in any bucket", () => {
      const day = buildDay({
        date: "2026-09-15",
        typeDay: WorkDayType.Regular,
        shifts: [],
        standardHours,
      });

      expect(day.totalHours).toBe(0);
      expect(workedHours(day)).toBe(0);
    });
  },
);
