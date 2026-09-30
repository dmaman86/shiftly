import {
  buildCalculators,
  buildCoreServices,
  buildDayLayer,
  buildMonthLayer,
  buildRateCalculators,
  buildResolvers,
  buildShiftLayer,
} from "./pipelines/index.js";
import { calculateDayFromShifts } from "./calculator/day-from-shifts.calculator.js";
import { PayMapPipeline } from "./types/domain.types.js";
import type { AdditionPolicy } from "./calculator/additions/addition.classifier.js";

export const buildPayMapPipeline = (
  options: { additionPolicy?: AdditionPolicy } = {},
): PayMapPipeline => {
  const services = buildCoreServices();

  const resolvers = buildResolvers();
  const rateCalculators = buildRateCalculators();

  const calculators = buildCalculators();

  const shiftLayer = buildShiftLayer({
    dateService: services.dateService,
    shiftService: services.shiftService,
    additionPolicy: options.additionPolicy,
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
    },
    rateCalculators: {
      holiday: rateCalculators.holiday,
      perDiem: rateCalculators.perDiem,
      mealAllowanceRate: rateCalculators.mealAllowanceRate,
    },
    services: {
      dateService: services.dateService,
      shiftService: services.shiftService,
    },
  };
};
