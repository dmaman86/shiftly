import {
  DefaultDayPayMapBuilder,
  DefaultWorkDaysForMonthBuilder,
} from "../builder";
import { MealAllowanceResolver } from "../resolve";
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
    extraShabbat: calculators.fixedSegments.extraShabbat,
  };

  const perDiemBundle: PerDiemBundle = {
    calculator: calculators.perDiem.day,
    rateResolver: resolvers.perDiemRateResolver,
  };

  const mealAllowanceResolver = new MealAllowanceResolver(
    calculators.mealAllowance.large,
    calculators.mealAllowance.small,
  );

  const mealAllowanceBundle: MealAllowanceBundle = {
    resolver: mealAllowanceResolver,
    rateResolver: resolvers.mealAllowanceRateResolver,
  };

  const dayPayMapBuilder = new DefaultDayPayMapBuilder(
    payCalculatorBundle,
    fixedSegmentBundle,
    perDiemBundle,
    mealAllowanceBundle,
  );

  // WorkDays builder
  const workDaysForMonthBuilder = new DefaultWorkDaysForMonthBuilder(
    resolvers.holidayResolver,
    resolvers.workDayInfoResolver,
    dateService,
  );

  return {
    dayPayMapBuilder,
    workDaysForMonthBuilder,
  };
};
