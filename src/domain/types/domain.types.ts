// src/domain/factories/types.ts
import { DateService } from "../services/date.service";
import { ShiftService } from "../services/shift.service";
import { DefaultHolidayCalculator } from "../calculator/holiday.calculator";
import { DefaultMonthResolver } from "../resolve/month.resolver";
import { WorkDayInfoResolver } from "../resolve/workdayinfo.resolver";
import { TimelineMealAllowanceCalculator } from "../calculator/mealallowance/timeline-meal-allowance.calculator";
import { TimelinePerDiemCalculator } from "../calculator/perdiem/timeline-per-diem.calculator";
import { ExtraCalculator } from "../calculator/extra/extra.calculator";
import { SpecialCalculator } from "../calculator/special/special.calculator";
import { FixedSegmentCalculator } from "../calculator/fixed-segment.calculator";
import { DefaultShiftMapBuilder } from "../builder/shiftmap.builder";
import { DefaultDayPayMapBuilder } from "../builder/daypaymap.builder";
import { DefaultWorkDaysForMonthBuilder } from "../builder/workdaysformonth.builder";
import { MonthPayMapReducer } from "../reducer/month-pay-map.reducer";
import { RegularBreakdown } from "./data-shapes";
import { RegularCalculator, ShiftRegularCalculator } from "./services";
import { Reducer } from "./core-behaviors";
import type {
  ComposedDayCalculationParams,
  DayFromShiftsCalculation,
} from "../calculator/day-from-shifts.calculator";

export interface CoreServices {
  dateService: DateService;
  shiftService: ShiftService;
}

export interface Resolvers {
  workDayInfoResolver: WorkDayInfoResolver;
  monthResolver: DefaultMonthResolver;
}

export interface RateCalculators {
  holiday: DefaultHolidayCalculator;
  perDiem: TimelinePerDiemCalculator;
  mealAllowanceRate: TimelineMealAllowanceCalculator;
}

export interface Calculators {
  regular: {
    byShift: ShiftRegularCalculator;
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
  calculators: Calculators;
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
