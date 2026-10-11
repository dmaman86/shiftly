import {
  ExtraCalculator,
  FixedSegmentCalculator,
  RegularByDayCalculator,
  TimelineMealAllowanceCalculator,
  SpecialCalculator,
} from "../calculator/index.js";
import { Calculators } from "../types/domain.types.js";

export const buildCalculators = (): Calculators => {
  const regularByDay = new RegularByDayCalculator();

  const extraCalculator = new ExtraCalculator();
  const specialCalculator = new SpecialCalculator();

  const sickCalculator = new FixedSegmentCalculator();
  const vacationCalculator = new FixedSegmentCalculator();
  const earnedShabbatCreditCalculator = new FixedSegmentCalculator();

  const mealAllowanceCalculator = new TimelineMealAllowanceCalculator();

  return {
    regular: {
      byDay: regularByDay,
      accumulator: regularByDay,
    },
    extra: extraCalculator,
    special: specialCalculator,
    fixedSegments: {
      sick: sickCalculator,
      vacation: vacationCalculator,
      earnedShabbatCredit: earnedShabbatCreditCalculator,
    },
    mealAllowance: {
      calculator: mealAllowanceCalculator,
    },
  };
};
