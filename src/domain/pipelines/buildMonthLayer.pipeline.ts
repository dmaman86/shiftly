import {
  FixedSegmentMonthReducer,
  MealAllowanceMonthReducer,
  MonthPayMapReducer,
} from "../reducer";
import { WorkDayMonthReducer } from "../reducer/workday-month.reducer";
import { FixedSegmentBundle, WorkDayReducerBundle } from "../types/bundles";
import { BuildMonthLayerParams, MonthLayer } from "../types/domain.types";

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
    extraShabbat: calculators.fixedSegments.extraShabbat,
  };

  const workPayMonthReducer = new WorkDayMonthReducer(workPay);
  const fixedMonthReducer = new FixedSegmentMonthReducer(fixedSegmentBundle);
  const allowancesMonthReducer = new MealAllowanceMonthReducer();

  const monthPayMapCalculator = new MonthPayMapReducer(
    workPayMonthReducer,
    fixedMonthReducer,
    allowancesMonthReducer,
    calculators.perDiem.month,
  );

  return {
    monthPayMapCalculator,
  };
};
