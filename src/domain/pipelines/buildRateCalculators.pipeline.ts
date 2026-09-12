import {
  DefaultHolidayCalculator,
  TimelineMealAllowanceRateCalculator,
  TimelinePerDiemRateCalculator,
} from "../calculator";
import { RateCalculators } from "../types/domain.types";

export const buildRateCalculators = (): RateCalculators => {
  return {
    holiday: new DefaultHolidayCalculator(),
    perDiemRate: new TimelinePerDiemRateCalculator(),
    mealAllowanceRate: new TimelineMealAllowanceRateCalculator(),
  };
};
