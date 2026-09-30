import type { MonthPayMap, MonthPayMapReducer, WorkDayMap } from "@shiftly/domain";

export const calculateGlobalBreakdown = (
  dailyPayMaps: Record<string, WorkDayMap>,
  monthPayMapCalculator: MonthPayMapReducer,
): MonthPayMap =>
  Object.values(dailyPayMaps).reduce(
    (breakdown, dayPayMap) =>
      monthPayMapCalculator.accumulate(breakdown, dayPayMap),
    monthPayMapCalculator.createEmpty(),
  );
