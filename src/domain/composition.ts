import {
  buildCalculators,
  buildCoreServices,
  buildDayLayer,
  buildMonthLayer,
  buildResolvers,
  buildShiftLayer,
} from "./pipelines";
import { PayMapPipeline } from "./types/domain.types";

export const buildPayMapPipeline = (): PayMapPipeline => {
  const services = buildCoreServices();

  const resolvers = buildResolvers();

  const calculators = buildCalculators();

  const shiftLayer = buildShiftLayer({
    shiftService: services.shiftService,
    calculators,
  });

  const dayLayer = buildDayLayer({
    dateService: services.dateService,
    calculators,
    resolvers,
  });

  const monthLayer = buildMonthLayer({
    calculators,
  });

  return {
    payMap: {
      shiftMapBuilder: shiftLayer.shiftMapBuilder,
      dayPayMapBuilder: dayLayer.dayPayMapBuilder,
      monthPayMapCalculator: monthLayer.monthPayMapCalculator,
      workDaysForMonthBuilder: dayLayer.workDaysForMonthBuilder,
    },
    resolvers: {
      perDiemRateResolver: resolvers.perDiemRateResolver,
      holidayResolver: resolvers.holidayResolver,
      workDayInfoResolver: resolvers.workDayInfoResolver,
      monthResolver: resolvers.monthResolver,
      mealAllowanceRateResolver: resolvers.mealAllowanceRateResolver,
    },
    services: {
      dateService: services.dateService,
      shiftService: services.shiftService,
    },
  };
};
