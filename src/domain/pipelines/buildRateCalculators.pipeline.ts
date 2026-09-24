import {
  DefaultHolidayCalculator,
  TimelineMealAllowanceCalculator,
  TimelinePerDiemCalculator,
} from "../calculator";
import { RateCalculators } from "../types/domain.types";

export const buildRateCalculators = (): RateCalculators => {
  return {
    holiday: new DefaultHolidayCalculator(),
    perDiem: new TimelinePerDiemCalculator(),
    mealAllowanceRate: new TimelineMealAllowanceCalculator(),
  };
};
