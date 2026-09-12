import {
  DateService,
  DayInfoResolver,
  DayPayMapBuilder,
  HolidayCalculator,
  MonthPayMapReducer,
  MonthResolver,
  PerDiemRateCalculator,
  ShiftMapBuilder,
  ShiftService,
  TimelineMealAllowanceRateCalculator,
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
    holidayResolver: HolidayCalculator;
    perDiemResolver: PerDiemRateCalculator;
    dayInfoResolver: DayInfoResolver;
    monthResolver: MonthResolver;
    mealAllowanceRateResolver: TimelineMealAllowanceRateCalculator;
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
