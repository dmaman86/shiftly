import { WorkDayStatus, WorkDayType } from "@/constants";
import { Builder, Calculator, Reducer, Resolver } from "./core-behaviors";
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
  WorkDayInfo,
  WorkDayMeta,
} from "./types";
import { MealAllowanceDayInfo } from "./bundles";

export interface RegularCalculator
  extends Calculator<
    {
      totalHours: number;
      standardHours: number;
      meta: WorkDayMeta;
    },
    RegularBreakdown
  > {
  createEmpty(): RegularBreakdown;
}

export type PerDiemShiftParams = {
  shift: Shift;
  isFieldDutyShift: boolean;
};

export interface PerDiemShiftCalculator
  extends Calculator<PerDiemShiftParams, PerDiemShiftInfo> {
  createEmpty(): PerDiemShiftInfo;
}

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
    eventMap: Record<string, string[]>;
  },
  WorkDayInfo[]
>;

export type HolidayResolver = Resolver<
  {
    weekday: number;
    eventTitles: string[];
  },
  WorkDayType
>;

export type PerDiemRateResolver = Resolver<
  {
    year: number;
    month: number;
  },
  number
>;

export type MealAllowanceRateResolver = Resolver<
  {
    year: number;
    month: number;
  },
  MealAllowanceRates
>;

export interface MealAllowanceLogicResolver
  extends Resolver<
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
