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
  MealAllowanceRates,
  PerDiemShiftInfo,
  CalendarEvent,
  DomainWorkDay,
  WorkDayMeta,
  LabeledSegmentRange,
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
}

export interface ShiftRegularCalculator extends RegularCalculator {
  calculateFromSegments(params: {
    segments: LabeledSegmentRange[];
    standardHours: number;
    meta: WorkDayMeta;
  }): RegularBreakdown;
}

export type PerDiemShiftParams = {
  shift: Shift;
  isFieldDutyShift: boolean;
};

// export type MonthPayMapReducer = Reducer<MonthPayMap, WorkDayMap>;

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

export type PerDiemRateCalculator = Calculator<
  {
    year: number;
    month: number;
  },
  number
>;

export type MealAllowanceRateCalculator = Calculator<
  {
    year: number;
    month: number;
  },
  MealAllowanceRates
>;

export interface MealAllowanceLogicCalculator extends Calculator<
  {
    day: MealAllowanceDayInfo;
    rates: MealAllowanceRates;
  },
  MealAllowance
> {
  createEmpty(): MealAllowance;
}

export type PerDiemDayCalculator = Calculator<
  {
    shifts: PerDiemShiftInfo[];
    rate: number;
  },
  DailyPerDiemInfo
>;

export type PerDiemMonthReducer = Reducer<PerDiemInfo>;

// export type MealAllowanceMonthReducer = Reducer<MealAllowance>;
