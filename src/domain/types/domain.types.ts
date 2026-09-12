// src/domain/factories/types.ts
import {
  DateService,
  ShiftService,
  DefaultHolidayCalculator,
  WorkDayInfoResolver,
  DefaultMonthResolver,
  TimelinePerDiemRateCalculator,
  TimelineMealAllowanceRateCalculator,
  RegularCalculator,
  ExtraCalculator,
  SpecialCalculator,
  FixedSegmentCalculator,
  LargeMealAllowanceCalculator,
  SmallMealAllowanceCalculator,
  DefaultPerDiemDayCalculator,
  DefaultPerDiemMonthCalculator,
  DefaultShiftMapBuilder,
  DefaultDayPayMapBuilder,
  DefaultWorkDaysForMonthBuilder,
  MonthPayMapReducer,
  RegularBreakdown,
  Reducer,
} from "@/domain";

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
