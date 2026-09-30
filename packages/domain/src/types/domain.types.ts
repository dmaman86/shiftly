import { DateService } from "../services/date.service.js";
import { ShiftService } from "../services/shift.service.js";
import { DefaultHolidayCalculator } from "../calculator/holiday.calculator.js";
import { WorkDayInfoResolver } from "../resolve/workdayinfo.resolver.js";
import { TimelineMealAllowanceCalculator } from "../calculator/mealallowance/timeline-meal-allowance.calculator.js";
import { TimelinePerDiemCalculator } from "../calculator/perdiem/timeline-per-diem.calculator.js";
import { ExtraCalculator } from "../calculator/extra/extra.calculator.js";
import { SpecialCalculator } from "../calculator/special/special.calculator.js";
import { FixedSegmentCalculator } from "../calculator/fixed-segment.calculator.js";
import { DefaultShiftMapBuilder } from "../builder/shiftmap.builder.js";
import { DefaultDayPayMapBuilder } from "../builder/daypaymap.builder.js";
import { DefaultWorkDaysForMonthBuilder } from "../builder/workdaysformonth.builder.js";
import { MonthPayMapReducer } from "../reducer/month-pay-map.reducer.js";
import { RegularBreakdown } from "./data-shapes.js";
import { RegularCalculator } from "./services.js";
import { Reducer } from "./core-behaviors.js";
import type {
  ComposedDayCalculationParams,
  DayFromShiftsCalculation,
} from "../calculator/day-from-shifts.calculator.js";
import type { AdditionPolicy } from "../calculator/additions/addition.classifier.js";

export interface CoreServices {
  dateService: DateService;
  shiftService: ShiftService;
}

export interface Resolvers {
  workDayInfoResolver: WorkDayInfoResolver;
}

export interface RateCalculators {
  holiday: DefaultHolidayCalculator;
  perDiem: TimelinePerDiemCalculator;
  mealAllowanceRate: TimelineMealAllowanceCalculator;
}

export interface Calculators {
  regular: {
    byDay: RegularCalculator;
    accumulator: Reducer<RegularBreakdown>;
  };
  extra: ExtraCalculator;
  special: SpecialCalculator;
  fixedSegments: {
    sick: FixedSegmentCalculator;
    vacation: FixedSegmentCalculator;
    earnedShabbatCredit: FixedSegmentCalculator;
  };
  mealAllowance: {
    calculator: TimelineMealAllowanceCalculator;
  };
}

export interface BuildShiftLayerParams {
  dateService: DateService;
  shiftService: ShiftService;
  additionPolicy?: AdditionPolicy;
}

export interface ShiftLayer {
  shiftMapBuilder: DefaultShiftMapBuilder;
}

export interface BuildDayLayerParams {
  dateService: DateService;
  calculators: Calculators;
  resolvers: Resolvers;
  rateCalculators: RateCalculators;
}

export interface DayLayer {
  dayPayMapBuilder: DefaultDayPayMapBuilder;
  workDaysForMonthBuilder: DefaultWorkDaysForMonthBuilder;
}

export interface BuildMonthLayerParams {
  calculators: Calculators;
}

export interface MonthLayer {
  monthPayMapCalculator: MonthPayMapReducer;
}

export interface PayMapPipeline {
  payMap: {
    shiftMapBuilder: DefaultShiftMapBuilder;
    dayPayMapBuilder: DefaultDayPayMapBuilder;
    monthPayMapCalculator: MonthPayMapReducer;
    workDaysForMonthBuilder: DefaultWorkDaysForMonthBuilder;
    calculateDayFromShifts: (
      params: ComposedDayCalculationParams,
    ) => DayFromShiftsCalculation;
  };
  resolvers: Resolvers;
  rateCalculators: RateCalculators;
  services: CoreServices;
}
