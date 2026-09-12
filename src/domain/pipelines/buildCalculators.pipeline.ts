import {
  DefaultPerDiemDayCalculator,
  DefaultPerDiemMonthCalculator,
  ExtraCalculator,
  FixedSegmentCalculator,
  LargeMealAllowanceCalculator,
  RegularByDayCalculator,
  RegularByShiftCalculator,
  SmallMealAllowanceCalculator,
  SpecialCalculator,
} from "../calculator";
import { RegularByMonthAccumulator } from "../reducer";
import { Calculators } from "../types/domain.types";

export const buildCalculators = (): Calculators => {
  const regularByShift = new RegularByShiftCalculator();
  const regularByDay = new RegularByDayCalculator();
  const regularAccumulator = new RegularByMonthAccumulator();

  const extraCalculator = new ExtraCalculator();
  const specialCalculator = new SpecialCalculator();

  const sickCalculator = new FixedSegmentCalculator();
  const vacationCalculator = new FixedSegmentCalculator();
  const earnedShabbatCreditCalculator = new FixedSegmentCalculator();

  const largeMealAllowanceCalculator = new LargeMealAllowanceCalculator();
  const smallMealAllowanceCalculator = new SmallMealAllowanceCalculator();

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
      earnedShabbatCredit: earnedShabbatCreditCalculator,
    },
    mealAllowance: {
      large: largeMealAllowanceCalculator,
      small: smallMealAllowanceCalculator,
    },
    perDiem: {
      day: perDiemDayCalculator,
      month: perDiemMonthCalculator,
    },
  };
};
