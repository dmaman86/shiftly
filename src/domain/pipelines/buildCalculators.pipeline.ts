import {
  DefaultPerDiemDayCalculator,
  DefaultPerDiemMonthCalculator,
  DefaultPerDiemShiftCalculator,
  ExtraCalculator,
  LargeMealAllowanceCalculator,
  SmallMealAllowanceCalculator,
  SpecialCalculator,
} from "../calculator";
import { FixedSegmentFactory, RegularFactory } from "../factory";
import { Calculators } from "../types/domain.types";

export const buildCalculators = (): Calculators => {
  const regularByShift = RegularFactory.byShift();
  const regularByDay = RegularFactory.byDay();
  const regularAccumulator = RegularFactory.monthReducer();

  const extraCalculator = new ExtraCalculator();
  const specialCalculator = new SpecialCalculator();

  const sickCalculator = new FixedSegmentFactory();
  const vacationCalculator = new FixedSegmentFactory();
  const extraShabbatCalculator = new FixedSegmentFactory();

  const largeMealAllowanceCalculator = new LargeMealAllowanceCalculator();
  const smallMealAllowanceCalculator = new SmallMealAllowanceCalculator();

  const perdiemShiftCalculator = new DefaultPerDiemShiftCalculator();
  const perDiemDayCalculator = new DefaultPerDiemDayCalculator();
  const perDiemMonthCalculator = new DefaultPerDiemMonthCalculator();

  return {
    regular: {
      byShift: regularByShift,
      byDay: regularByDay,
      accumulator: regularAccumulator,
    },
    extra: extraCalculator,
    special: specialCalculator,
    fixedSegments: {
      sick: sickCalculator,
      vacation: vacationCalculator,
      extraShabbat: extraShabbatCalculator,
    },
    mealAllowance: {
      large: largeMealAllowanceCalculator,
      small: smallMealAllowanceCalculator,
    },
    perDiem: {
      shift: perdiemShiftCalculator,
      day: perDiemDayCalculator,
      month: perDiemMonthCalculator,
    },
  };
};
