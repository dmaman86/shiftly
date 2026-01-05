import {
  DateService,
  DayInfoResolver,
  DayPayMapBuilder,
  HolidayResolver,
  MonthPayMapReducer,
  MonthResolver,
  PerDiemRateResolver,
  ShiftMapBuilder,
  ShiftService,
  TimelineMealAllowanceRateResolver,
  WorkDaysForMonthBuilder,
} from "@/domain";

export type DomainContextType = {
  payMap: {
    shiftMapBuilder: ShiftMapBuilder;
    dayPayMapBuilder: DayPayMapBuilder;
    monthPayMapCalculator: MonthPayMapReducer;
    workDaysMonthBuilder: WorkDaysForMonthBuilder;
  };
  resolvers: {
    holidayResolver: HolidayResolver;
    perDiemResolver: PerDiemRateResolver;
    dayInfoResolver: DayInfoResolver;
    monthResolver: MonthResolver;
    mealAllowanceRateResolver: TimelineMealAllowanceRateResolver;
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
