import {
  DefaultHolidayCalculator,
  TimelineMealAllowanceCalculator,
  TimelinePerDiemCalculator,
} from "../calculator/index.js";
import { RateCalculators } from "../types/domain.types.js";

export const buildRateCalculators = (): RateCalculators => {
  return {
    holiday: new DefaultHolidayCalculator(),
    perDiem: new TimelinePerDiemCalculator(),
    mealAllowanceRate: new TimelineMealAllowanceCalculator(),
  };
};
