import {
  DefaultMonthResolver,
  HolidayResolverService,
  TimelineMealAllowanceRateResolver,
  TimelinePerDiemRateResolver,
  WorkDayInfoResolver,
} from "../resolve";
import { Resolvers } from "../types/domain.types";

export const buildResolvers = (): Resolvers => {
  const holidayResolver = new HolidayResolverService();
  const workDayInfoResolver = new WorkDayInfoResolver();
  const monthResolver = new DefaultMonthResolver();
  const perDiemRateResolver = new TimelinePerDiemRateResolver();
  const mealAllowanceRateResolver = new TimelineMealAllowanceRateResolver();

  return {
    holidayResolver,
    workDayInfoResolver,
    monthResolver,
    perDiemRateResolver,
    mealAllowanceRateResolver,
  };
};
