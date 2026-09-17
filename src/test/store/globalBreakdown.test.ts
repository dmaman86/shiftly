import { describe, expect, it, vi } from "vitest";
import type { MonthPayMap, MonthPayMapReducer, WorkDayMap } from "@/domain";
import { calculateGlobalBreakdown } from "@/store/globalBreakdown";

describe("calculateGlobalBreakdown", () => {
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
