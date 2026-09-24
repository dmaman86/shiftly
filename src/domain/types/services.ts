import { WorkDayStatus, WorkDayType } from "@/domain/constants";
import { Builder, Calculator, Reducer } from "./core-behaviors";
import {
  DailyPerDiemInfo,
  MealAllowance,
  PerDiemInfo,
  RegularBreakdown,
  Shift,
  ShiftPayMap,
  WorkDayMap,
} from "./data-shapes";
import {
  PerDiemShiftInfo,
  CalendarEvent,
  DomainWorkDay,
  WorkDayMeta,
  ClassifiedInterval,
} from "./types";
import { MealAllowanceDayInfo } from "./bundles";

export interface RegularCalculator extends Calculator<
  {
    totalHours: number;
    standardHours: number;
    meta: WorkDayMeta;
  },
  RegularBreakdown
> {
  createEmpty(): RegularBreakdown;
  calculateClassified: (params: {
    intervals: ClassifiedInterval[];
    standardHours: number;
    meta: WorkDayMeta;
  }) => RegularBreakdown;
}

export type ShiftRegularCalculator = RegularCalculator;

export type ShiftMapBuilder = Builder<
  {
    shift: Shift;
    meta: WorkDayMeta;
    standardHours: number;
    isFieldDutyShift: boolean;
  },
  ShiftPayMap
>;

export type DayPayMapBuilder = Builder<
  {
    shifts: ShiftPayMap[];
    status: WorkDayStatus;
    meta: WorkDayMeta;
    standardHours: number;
    year: number;
    month: number;
  },
  WorkDayMap
>;

export type WorkDaysForMonthBuilder = Builder<
  {
    year: number;
    month: number;
    eventMap: Record<string, CalendarEvent[]>;
  },
  DomainWorkDay[]
>;

export type HolidayCalculator = Calculator<
  {
    weekday: number;
    events: CalendarEvent[];
  },
  WorkDayType
>;

export interface MealAllowanceCalculator {
  createEmpty(): MealAllowance;
  calculateAllowance(params: {
    day: MealAllowanceDayInfo;
    year: number;
    month: number;
  }): MealAllowance;
}

export interface PerDiemCalculator {
  calculateRate(params: { year: number; month: number }): number;
  calculateDay(params: {
    shifts: PerDiemShiftInfo[];
    rate: number;
  }): DailyPerDiemInfo;
}

export type PerDiemRateResolver = Pick<PerDiemCalculator, "calculateRate">;

export type PerDiemMonthReducer = Reducer<PerDiemInfo>;
