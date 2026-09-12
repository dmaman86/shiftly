import {
  buildCalculators,
  buildCoreServices,
  buildDayLayer,
  buildMonthLayer,
  buildRateCalculators,
  buildResolvers,
  buildShiftLayer,
} from "./pipelines";
import { DomainConfig, PayMapPipeline } from "./types/domain.types";

export const buildPayMapPipeline = (config: DomainConfig): PayMapPipeline => {
  const services = buildCoreServices(config);

  const resolvers = buildResolvers(services.dateService);
  const rateCalculators = buildRateCalculators();

  const calculators = buildCalculators();

  const shiftLayer = buildShiftLayer({
    dateService: services.dateService,
    shiftService: services.shiftService,
    calculators,
  });

  const dayLayer = buildDayLayer({
    dateService: services.dateService,
    calculators,
    resolvers,
    rateCalculators,
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
      workDayInfoResolver: resolvers.workDayInfoResolver,
      monthResolver: resolvers.monthResolver,
    },
    rateCalculators: {
      holiday: rateCalculators.holiday,
      perDiemRate: rateCalculators.perDiemRate,
      mealAllowanceRate: rateCalculators.mealAllowanceRate,
    },
    services: {
      dateService: services.dateService,
      shiftService: services.shiftService,
    },
  };
};
