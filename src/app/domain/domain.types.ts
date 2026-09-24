import {
  DateService,
  DayInfoResolver,
  DayPayMapBuilder,
  HolidayCalculator,
  MonthPayMapReducer,
  MonthResolver,
  PerDiemRateResolver,
  ShiftMapBuilder,
  ShiftService,
  TimelineMealAllowanceCalculator,
  WorkDaysForMonthBuilder,
  ComposedDayCalculationParams,
  DayFromShiftsCalculation,
} from "@/domain";

export type DomainContextType = {
  payMap: {
    shiftMapBuilder: ShiftMapBuilder;
    dayPayMapBuilder: DayPayMapBuilder;
    monthPayMapCalculator: MonthPayMapReducer;
    workDaysMonthBuilder: WorkDaysForMonthBuilder;
    calculateDayFromShifts: (
      params: ComposedDayCalculationParams,
    ) => DayFromShiftsCalculation;
  };
  resolvers: {
    holidayResolver: HolidayCalculator;
    perDiemResolver: PerDiemRateResolver;
    dayInfoResolver: DayInfoResolver;
    monthResolver: MonthResolver;
    mealAllowanceRateResolver: TimelineMealAllowanceCalculator;
  };
  services: {
    dateService: DateService;
    shiftService: ShiftService;
  };
};

export interface AppSnackbarContextType {
  info(message: string): void;
  success(message: string): void;
  warning(message: string): void;
  error(message: string): void;
}
