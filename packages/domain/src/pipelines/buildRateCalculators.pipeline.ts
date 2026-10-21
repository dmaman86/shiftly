import {
  DefaultHolidayCalculator,
  TimelineMealAllowanceCalculator,
  TimelinePerDiemCalculator,
} from "../calculator/index.js";
import type { ReferenceResolver } from "../reference/reference-resolver.js";
import { RateCalculators } from "../types/domain.types.js";

export const buildRateCalculators = (
  references: ReferenceResolver,
): RateCalculators => {
  return {
    holiday: new DefaultHolidayCalculator(),
    perDiem: new TimelinePerDiemCalculator(references),
    mealAllowanceRate: new TimelineMealAllowanceCalculator(references),
  };
};
