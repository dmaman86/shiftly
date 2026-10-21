import {
  buildCalculators,
  buildDayLayer,
  buildMonthLayer,
  buildRateCalculators,
  buildShiftLayer,
} from "./pipelines/index.js";
import { calculateDayFromShifts } from "./calculator/day-from-shifts.calculator.js";
import { PayMapPipeline } from "./types/domain.types.js";
import type { AdditionPolicy } from "./calculator/additions/addition.classifier.js";
import { DateService, ShiftService } from "./services/index.js";
import { WorkDayInfoResolver } from "./resolve/workdayinfo.resolver.js";
import { BASELINE_REFERENCES } from "./reference/baseline.js";
import type { ReferenceResolver } from "./reference/reference-resolver.js";

export const buildPayMapPipeline = (
  options: {
    additionPolicy?: AdditionPolicy;
    /** Rates and other timeline values; the embedded baseline by default. */
    referenceResolver?: ReferenceResolver;
  } = {},
): PayMapPipeline => {
  const dateService = new DateService();
  const services = { dateService, shiftService: new ShiftService(dateService) };

  const resolvers = { workDayInfoResolver: new WorkDayInfoResolver() };
  const rateCalculators = buildRateCalculators(
    options.referenceResolver ?? BASELINE_REFERENCES,
  );

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
