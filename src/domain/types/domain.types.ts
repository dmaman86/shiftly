// src/domain/factories/types.ts
import { DateService } from "../services/date.service";
import { ShiftService } from "../services/shift.service";
import { DefaultHolidayCalculator } from "../calculator/holiday.calculator";
import { DefaultMonthResolver } from "../resolve/month.resolver";
import { WorkDayInfoResolver } from "../resolve/workdayinfo.resolver";
import { TimelinePerDiemRateCalculator } from "../calculator/perdiem/timeline-per-diem-rate.calculator";
import { TimelineMealAllowanceRateCalculator } from "../calculator/mealallowance/timeline-meal-allowance-rate.calculator";
import { ExtraCalculator } from "../calculator/extra/extra.calculator";
import { SpecialCalculator } from "../calculator/special/special.calculator";
import { FixedSegmentCalculator } from "../calculator/fixed-segment.calculator";
import { LargeMealAllowanceCalculator } from "../calculator/mealallowance/large-mealallowance.calculator";
import { SmallMealAllowanceCalculator } from "../calculator/mealallowance/small-mealallowance.calculator";
import { DefaultPerDiemDayCalculator } from "../calculator/perdiem/perdiem-day.calculator";
import { DefaultPerDiemMonthCalculator } from "../calculator/perdiem/perdiem-month.calculator";
import { DefaultShiftMapBuilder } from "../builder/shiftmap.builder";
import { DefaultDayPayMapBuilder } from "../builder/daypaymap.builder";
import { DefaultWorkDaysForMonthBuilder } from "../builder/workdaysformonth.builder";
import { MonthPayMapReducer } from "../reducer/month-pay-map.reducer";
import { RegularBreakdown } from "./data-shapes";
import { RegularCalculator } from "./services";
import { Reducer } from "./core-behaviors";

export interface CoreServices {
  dateService: DateService;
  shiftService: ShiftService;
}

export interface DomainConfig {
  timeZone: string;
}

export interface Resolvers {
  workDayInfoResolver: WorkDayInfoResolver;
  monthResolver: DefaultMonthResolver;
}

export interface RateCalculators {
  holiday: DefaultHolidayCalculator;
  perDiemRate: TimelinePerDiemRateCalculator;
  mealAllowanceRate: TimelineMealAllowanceRateCalculator;
}

export interface Calculators {
  regular: {
    byShift: RegularCalculator;
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
    large: LargeMealAllowanceCalculator;
    small: SmallMealAllowanceCalculator;
  };
  perDiem: {
    day: DefaultPerDiemDayCalculator;
    month: DefaultPerDiemMonthCalculator;
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
  };
  resolvers: Resolvers;
  rateCalculators: RateCalculators;
  services: CoreServices;
}
