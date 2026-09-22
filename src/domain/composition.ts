import {
  buildCalculators,
  buildCoreServices,
  buildDayLayer,
  buildMonthLayer,
  buildRateCalculators,
  buildResolvers,
  buildShiftLayer,
} from "./pipelines";
import { calculateDayFromShifts } from "./calculator/day-from-shifts.calculator";
import { PayMapPipeline } from "./types/domain.types";

export const buildPayMapPipeline = (): PayMapPipeline => {
  const services = buildCoreServices();

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
      calculateDayFromShifts: (params) =>
        calculateDayFromShifts({
          ...params,
          dayPayMapBuilder: dayLayer.dayPayMapBuilder,
          shiftMapBuilder: shiftLayer.shiftMapBuilder,
        }),
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
