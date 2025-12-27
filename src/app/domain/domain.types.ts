import {
  DayInfoResolver,
  DayPayMapBuilder,
  HolidayResolver,
  MonthPayMapReducer,
  MonthResolver,
  PerDiemRateResolver,
  ShiftMapBuilder,
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
};
