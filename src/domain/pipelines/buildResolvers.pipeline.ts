import { DefaultMonthResolver, WorkDayInfoResolver } from "../resolve";
import { DateService } from "../services/date.service";
import { Resolvers } from "../types/domain.types";

export const buildResolvers = (dateService: DateService): Resolvers => {
  const workDayInfoResolver = new WorkDayInfoResolver(dateService);
  const monthResolver = new DefaultMonthResolver();

  return {
    workDayInfoResolver,
    monthResolver,
  };
};
