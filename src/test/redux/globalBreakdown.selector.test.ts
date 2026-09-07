import { describe, expect, it, vi } from "vitest";
import type { MonthPayMap, MonthPayMapReducer, WorkDayMap } from "@/domain";
import type { RootState } from "@/redux/store";
import { createSelectGlobalBreakdown } from "@/redux/selectors/globalBreakdown.selector";

const createState = (
  dailyPayMaps: Record<string, WorkDayMap>,
  baseRate = 50,
) =>
  ({
    global: {
      config: { standardHours: 6.67, baseRate, year: 2026, month: 9 },
      dailyPayMaps,
    },
    workDays: { year: 2026, month: 9, workDays: [] },
  }) as RootState;

describe("createSelectGlobalBreakdown", () => {
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

    const result = createSelectGlobalBreakdown(calculator)(
      createState(dailyPayMaps),
    );

    expect(result.totalHours).toBe(10);
    expect(createEmpty).toHaveBeenCalledOnce();
    expect(accumulate).toHaveBeenCalledTimes(2);
  });

  it("does not recalculate when unrelated state changes", () => {
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
    const selector = createSelectGlobalBreakdown(calculator);

    const firstResult = selector(createState(dailyPayMaps, 50));
    const secondResult = selector(createState(dailyPayMaps, 75));

    expect(secondResult).toBe(firstResult);
    expect(createEmpty).toHaveBeenCalledOnce();
    expect(accumulate).toHaveBeenCalledOnce();
  });
});
