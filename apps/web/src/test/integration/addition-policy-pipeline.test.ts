import { describe, expect, it } from "vitest";
import { buildPayMapPipeline } from "@shiftly/domain";
import { WorkDayType } from "@shiftly/domain";
import { monthToPayBreakdownVM } from "@/adapters";
import { computeTotalPay } from "@/utils";
import { calculateGlobalBreakdown } from "@/store/globalBreakdown";

describe("addition policy through the salary pipeline", () => {
  it("preserves different rates through shift, day, month and final salary", () => {
    const pipeline = buildPayMapPipeline({
      additionPolicy: (date) => ({
        eveningPercent: date === "2026-08-03" ? 0.2 : 0.3,
        nightPercent: 0.5,
        eveningQualificationMinutes: 180,
      }),
    });
    const calculateDay = (date: string) => pipeline.payMap.calculateDayFromShifts({
      meta: { date, typeDay: WorkDayType.Regular, crossDayContinuation: false },
      year: 2026,
      month: 8,
      standardHours: 8,
      shifts: [{
        id: date,
        start: { date: pipeline.services.dateService.createDateWithTime(date, 14) },
        end: { date: pipeline.services.dateService.createDateWithTime(date, 18) },
        isDuty: false,
      }],
    });
    const first = calculateDay("2026-08-03");
    const second = calculateDay("2026-08-04");
    const reducer = pipeline.payMap.monthPayMapCalculator;
    const month = reducer.accumulate(
      reducer.accumulate(reducer.createEmpty(), first.dayPayMap),
      second.dayPayMap,
    );

    expect(second.shiftPayMaps[0].extra["evening:0.3"]).toEqual({ percent: 0.3, hours: 4 });
    expect(second.dayPayMap.workMap.extra["evening:0.3"]).toEqual({ percent: 0.3, hours: 4 });
    expect(month.extra.hours20).toEqual({ percent: 0.2, hours: 4 });
    expect(month.extra["evening:0.3"]).toEqual({ percent: 0.3, hours: 4 });

    const viewModel = monthToPayBreakdownVM(month, 0);
    const allowances = viewModel.perDiemAmount + viewModel.largeAmount + viewModel.smallAmount;
    expect(computeTotalPay(viewModel, 50)).toBeCloseTo(500 + allowances, 10);

    const afterRemoval = calculateGlobalBreakdown({ "2026-08-03": first.dayPayMap }, reducer);
    expect(afterRemoval.extra["evening:0.3"]).toBeUndefined();
    expect(afterRemoval.extra.hours20.hours).toBe(4);
    expect(month.extra["evening:0.3"].hours).toBe(4);
  });

  it("preserves night-based meal allowance eligibility when the night rate changes", () => {
    const calculateNight = (nightPercent: number) => {
      const pipeline = buildPayMapPipeline({
        additionPolicy: () => ({
          eveningPercent: 0.2,
          nightPercent,
          eveningQualificationMinutes: 180,
        }),
      });
      const date = "2026-08-03";
      return pipeline.payMap.calculateDayFromShifts({
        meta: { date, typeDay: WorkDayType.Regular, crossDayContinuation: false },
        year: 2026,
        month: 8,
        standardHours: 8,
        shifts: [{
          id: "night",
          start: { date: pipeline.services.dateService.createDateWithTime(date, 0) },
          end: { date: pipeline.services.dateService.createDateWithTime(date, 6) },
          isDuty: false,
        }],
      }).dayPayMap;
    };

    const custom = calculateNight(0.6);
    const baseline = calculateNight(0.5);
    expect(custom.workMap.extra["night:0.6"]).toEqual({ percent: 0.6, hours: 6 });
    expect(baseline.mealAllowance.small.points).toBe(1);
    expect(custom.mealAllowance).toEqual(baseline.mealAllowance);
  });

  it("keeps evening qualification per shift rather than combining separate shifts", () => {
    const pipeline = buildPayMapPipeline({
      additionPolicy: () => ({ eveningPercent: 0.3, nightPercent: 0.5, eveningQualificationMinutes: 180 }),
    });
    const date = "2026-08-03";
    const result = pipeline.payMap.calculateDayFromShifts({
      meta: { date, typeDay: WorkDayType.Regular, crossDayContinuation: false },
      year: 2026,
      month: 8,
      standardHours: 8,
      shifts: [14, 17].map((hour) => ({
        id: String(hour),
        start: { date: pipeline.services.dateService.createDateWithTime(date, hour) },
        end: { date: pipeline.services.dateService.createDateWithTime(date, hour + 2) },
        isDuty: false,
      })),
    });

    expect(result.dayPayMap.workMap.extra["evening:0.3"]).toBeUndefined();
  });
});
