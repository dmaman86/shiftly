import { describe, expect, it, vi } from "vitest";
import type { MonthPayMap, MonthPayMapReducer, WorkDayMap } from "@shiftly/domain";
import { calculateGlobalBreakdown } from "@/store/globalBreakdown";

describe("calculateGlobalBreakdown", () => {
  it("recomputes totals after replacing or removing a day, including an empty month", () => {
    const calculator = {
      createEmpty: () => ({ totalHours: 0 }),
      accumulate: (base: MonthPayMap, day: WorkDayMap) => ({ totalHours: base.totalHours + day.totalHours }),
    } as unknown as MonthPayMapReducer;
    const original = {
      "2026-09-01": { totalHours: 4 } as WorkDayMap,
      "2026-09-02": { totalHours: 6 } as WorkDayMap,
    };
    const updated = { ...original, "2026-09-01": { totalHours: 2 } as WorkDayMap };
    const remaining = { "2026-09-02": updated["2026-09-02"] };

    expect(calculateGlobalBreakdown(original, calculator).totalHours).toBe(10);
    expect(calculateGlobalBreakdown(updated, calculator).totalHours).toBe(8);
    expect(calculateGlobalBreakdown(remaining, calculator).totalHours).toBe(6);
    expect(calculateGlobalBreakdown({}, calculator).totalHours).toBe(0);
    expect(original["2026-09-01"].totalHours).toBe(4);
  });
  it("accumulates every daily pay map", () => {
    const createEmpty = vi.fn(
      () => ({ totalHours: 0 }) as MonthPayMap,
    );
    const accumulate = vi.fn(
      (breakdown: MonthPayMap, dayPayMap: WorkDayMap) =>
        ({
          totalHours: breakdown.totalHours + dayPayMap.totalHours,
        }) as MonthPayMap,
    );
    const calculator = {
      createEmpty,
      accumulate,
    } as unknown as MonthPayMapReducer;
    const dailyPayMaps = {
      "2026-09-01": { totalHours: 4 } as WorkDayMap,
      "2026-09-02": { totalHours: 6 } as WorkDayMap,
    };

    const result = calculateGlobalBreakdown(dailyPayMaps, calculator);

    expect(result.totalHours).toBe(10);
    expect(createEmpty).toHaveBeenCalledOnce();
    expect(accumulate).toHaveBeenCalledTimes(2);
  });

  it("calculates the same input consistently", () => {
    const createEmpty = vi.fn(
      () => ({ totalHours: 0 }) as MonthPayMap,
    );
    const accumulate = vi.fn(
      (breakdown: MonthPayMap, dayPayMap: WorkDayMap) =>
        ({
          totalHours: breakdown.totalHours + dayPayMap.totalHours,
        }) as MonthPayMap,
    );
    const calculator = {
      createEmpty,
      accumulate,
    } as unknown as MonthPayMapReducer;
    const dailyPayMaps = {
      "2026-09-01": { totalHours: 4 } as WorkDayMap,
    };
    const firstResult = calculateGlobalBreakdown(dailyPayMaps, calculator);
    const secondResult = calculateGlobalBreakdown(dailyPayMaps, calculator);

    expect(secondResult).toEqual(firstResult);
    expect(createEmpty).toHaveBeenCalledTimes(2);
    expect(accumulate).toHaveBeenCalledTimes(2);
  });
});
