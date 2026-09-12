import {
  DefaultDayPayMapBuilder,
  DefaultWorkDaysForMonthBuilder,
} from "../builder";
import { DefaultMealAllowanceCalculator } from "../calculator";
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
    calculator: calculators.perDiem.day,
    rateResolver: rateCalculators.perDiemRate,
  };

  const mealAllowanceResolver = new DefaultMealAllowanceCalculator(
    calculators.mealAllowance.large,
    calculators.mealAllowance.small,
  );

  const mealAllowanceBundle: MealAllowanceBundle = {
    resolver: mealAllowanceResolver,
    rateResolver: rateCalculators.mealAllowanceRate,
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
