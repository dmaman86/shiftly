import {
  DefaultMonthResolver,
  HolidayResolverService,
  TimelineMealAllowanceRateResolver,
  TimelinePerDiemRateResolver,
  WorkDayInfoResolver,
} from "../resolve";
import { DateService } from "../services/date.service";
import { Resolvers } from "../types/domain.types";

export const buildResolvers = (dateService: DateService): Resolvers => {
  const holidayResolver = new HolidayResolverService();
  const workDayInfoResolver = new WorkDayInfoResolver(dateService);
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
