import { WorkDayType, HolidayKey } from "../constants";

import {
  DailyPerDiemInfo,
  ExtraBreakdown,
  RegularBreakdown,
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
  holidayKey?: HolidayKey;
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
  key: SegmentKey;
}

export interface DomainWorkDay {
  meta: WorkDayMeta;
}

export enum CalendarEventKind {
  PaidHoliday = "paid-holiday",
  PartialHolidayStart = "partial-holiday-start",
}

export interface CalendarEvent {
  kind: CalendarEventKind;
  holidayKey?: HolidayKey;
}

export type CalendarEventMap = Record<string, CalendarEvent[]>;

export type ApiResponse<T> =
  | { data: T; error?: never }
  | { data?: never; error: string };

export interface DayInfoResolver {
  isSpecialFullDay(day: DomainWorkDay): boolean;
  isPartialHolidayStart(day: DomainWorkDay): boolean;
  hasCrossDayContinuation(day: DomainWorkDay): boolean;
  formatWorkDayLabel(day: DomainWorkDay, weekdayLabel: string): string;
}

export enum Mode {
  BY_SHIFT,
  BY_DAY,
  BY_MONTH,
}

export interface MonthResolver {
  getAvailableMonths(year: number): number[];
  resolveDefaultMonth(year: number): number;
  getCurrentYear(): number;
}

export type MealAllowanceKind = "SMALL" | "LARGE";

export interface MealAllowanceRates {
  small: number;
  large: number;
}
