import {
  DateService,
  DayPayMapBuilder,
  HolidayCalculator,
  MonthPayMapReducer,
  PerDiemRateResolver,
  ShiftMapBuilder,
  ShiftService,
  TimelineMealAllowanceCalculator,
  WorkDaysForMonthBuilder,
  ComposedDayCalculationParams,
  DayFromShiftsCalculation,
} from "@shiftly/domain";
import type { MonthResolver } from "../months/month.types";
import type { DayInfoPresenter } from "./workdayinfo.presenter";

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
    dayInfoResolver: DayInfoPresenter;
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
