import {
  FixedSegmentMonthReducer,
  MealAllowanceMonthReducer,
  MonthPayMapReducer,
  DefaultPerDiemMonthReducer,
} from "../reducer/index.js";
import { WorkDayMonthReducer } from "../reducer/workday-month.reducer.js";
import { FixedSegmentBundle, WorkDayReducerBundle } from "../types/bundles.js";
import { BuildMonthLayerParams, MonthLayer } from "../types/domain.types.js";

export const buildMonthLayer = ({
  calculators,
}: BuildMonthLayerParams): MonthLayer => {
  const workPay: WorkDayReducerBundle = {
    regular: calculators.regular.accumulator,
    extra: calculators.extra,
    special: calculators.special,
  };

  const fixedSegmentBundle: FixedSegmentBundle = {
    sick: calculators.fixedSegments.sick,
    vacation: calculators.fixedSegments.vacation,
    earnedShabbatCredit: calculators.fixedSegments.earnedShabbatCredit,
  };

  const workPayMonthReducer = new WorkDayMonthReducer(workPay);
  const fixedMonthReducer = new FixedSegmentMonthReducer(fixedSegmentBundle);
  const allowancesMonthReducer = new MealAllowanceMonthReducer();

  const monthPayMapCalculator = new MonthPayMapReducer(
    workPayMonthReducer,
    fixedMonthReducer,
    allowancesMonthReducer,
    new DefaultPerDiemMonthReducer(),
  );

  return {
    monthPayMapCalculator,
  };
};
