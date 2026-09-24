import {
  DefaultDayPayMapBuilder,
  DefaultWorkDaysForMonthBuilder,
} from "../builder";
import {
  FixedSegmentBundle,
  MealAllowanceBundle,
  PayCalculationBundle,
  PerDiemBundle,
} from "../types/bundles";
import { BuildDayLayerParams, DayLayer } from "../types/domain.types";

export const buildDayLayer = ({
  dateService,
  calculators,
  resolvers,
  rateCalculators,
}: BuildDayLayerParams): DayLayer => {
  // PayMap builder
  const payCalculatorBundle: PayCalculationBundle = {
    regular: calculators.regular.byDay,
    extra: calculators.extra,
    special: calculators.special,
  };

  const fixedSegmentBundle: FixedSegmentBundle = {
    sick: calculators.fixedSegments.sick,
    vacation: calculators.fixedSegments.vacation,
    earnedShabbatCredit: calculators.fixedSegments.earnedShabbatCredit,
  };

  const perDiemBundle: PerDiemBundle = {
    calculator: rateCalculators.perDiem,
  };

  const mealAllowanceBundle: MealAllowanceBundle = {
    calculator: calculators.mealAllowance.calculator,
  };

  const dayPayMapBuilder = new DefaultDayPayMapBuilder(
    payCalculatorBundle,
    fixedSegmentBundle,
    perDiemBundle,
    mealAllowanceBundle,
  );

  // WorkDays builder
  const workDaysForMonthBuilder = new DefaultWorkDaysForMonthBuilder(
    rateCalculators.holiday,
    resolvers.workDayInfoResolver,
    dateService,
  );

  return {
    dayPayMapBuilder,
    workDaysForMonthBuilder,
  };
};
