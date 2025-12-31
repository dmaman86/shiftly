import { WorkDayType } from "@/constants";

export type TableViewMode = "compact" | "expanded";

import {
  DailyPerDiemInfo,
  ExtraBreakdown,
  RegularBreakdown,
  Segment,
  Shift,
  SpecialBreakdown,
} from "./data-shapes";

export interface WorkDayMapByShift {
  id: string;
  regular: RegularBreakdown;
  extra: ExtraBreakdown;
  special: SpecialBreakdown;
  totalHours: number;
}

export interface PerDiemShiftInfo {
  isFieldDutyShift: boolean;
  hours: number;
}

export interface DayShift {
  id: string;
  shift: Shift;
  breakdown: WorkDayMapByShift;
  perDiemShift: DailyPerDiemInfo;
}

export interface WorkDayMeta {
  date: string;
  typeDay: WorkDayType;
  crossDayContinuation: boolean;
}

export interface Point {
  start: number;
  end: number;
}

export type SegmentKey =
  | "hours100"
  | keyof ExtraBreakdown
  | keyof SpecialBreakdown;

export interface LabeledSegmentRange {
  point: Point;
  percent: number;
  key: string;
}

export interface WorkDayInfo {
  meta: WorkDayMeta;
  hebrewDay: string;
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
}

export interface DayInfoResolver {
  isSpecialFullDay(day: WorkDayInfo): boolean;
  isPartialHolidayStart(day: WorkDayInfo): boolean;
  hasCrossDayContinuation(day: WorkDayInfo): boolean;
  formatHebrewWorkDay(day: WorkDayInfo): string;
}

export enum Mode {
  BY_SHIFT,
  BY_DAY,
  BY_MONTH,
}

export type PayBreakdownViewModel = {
  totalHours: number;

  regular: RegularBreakdown;
  extra: ExtraBreakdown;
  special: SpecialBreakdown;

  hours100Sick: Segment;
  hours100Vacation: Segment;
  extra100Shabbat: Segment;

  perDiemPoints: number;
  perDiemAmount: number;

  largePoints: number;
  largeAmount: number;

  smallPoints: number;
  smallAmount: number;
};

export type CompactPayBreakdownVM = {
  totalHours: number;
  regularHours: number;
  extraHours: number;
  dailySalary?: number;
};

export interface MonthResolver {
  getAvailableMonthOptions(year: number): { value: number; label: string }[];
  getAvailableMonths(year: number): number[];
  resolveDefaultMonth(year: number): number;
  getMonthName(monthIndex: number): string;
  getAllMonthNames(): string[];
  getCurrentYear(): number;
}

export type MealAllowanceKind = "SMALL" | "LARGE";

export interface MealAllowanceRates {
  small: number;
  large: number;
}
