// src/domain/factories/types.ts
import {
  DateService,
  ShiftService,
  HolidayResolverService,
  WorkDayInfoResolver,
  DefaultMonthResolver,
  TimelinePerDiemRateResolver,
  TimelineMealAllowanceRateResolver,
  RegularCalculator,
  ExtraCalculator,
  SpecialCalculator,
  FixedSegmentFactory,
  LargeMealAllowanceCalculator,
  SmallMealAllowanceCalculator,
  DefaultPerDiemShiftCalculator,
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

export interface Resolvers {
  holidayResolver: HolidayResolverService;
  workDayInfoResolver: WorkDayInfoResolver;
  monthResolver: DefaultMonthResolver;
  perDiemRateResolver: TimelinePerDiemRateResolver;
  mealAllowanceRateResolver: TimelineMealAllowanceRateResolver;
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
    sick: FixedSegmentFactory;
    vacation: FixedSegmentFactory;
    extraShabbat: FixedSegmentFactory;
  };
  mealAllowance: {
    large: LargeMealAllowanceCalculator;
    small: SmallMealAllowanceCalculator;
  };
  perDiem: {
    shift: DefaultPerDiemShiftCalculator;
    day: DefaultPerDiemDayCalculator;
    month: DefaultPerDiemMonthCalculator;
  };
}

export interface BuildShiftLayerParams {
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
  services: CoreServices;
}
