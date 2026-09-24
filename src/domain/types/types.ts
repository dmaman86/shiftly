import { WorkDayType, HolidayKey } from "../constants";
import { ExtraBreakdown, SpecialBreakdown } from "./data-shapes";

export interface PerDiemShiftInfo {
  isFieldDutyShift: boolean;
  hours: number;
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

export type TimelineCategory = "regular" | "special";

export type TimelineRule =
  | "regular"
  | "evening"
  | "night"
  | "special150"
  | "special200";

/**
 * Explicit classification representation introduced alongside the legacy
 * rate-key representation. It is intentionally not yet the public pay-map
 * output so existing consumers can migrate incrementally.
 */
export interface ClassifiedInterval {
  point: Point;
  category: TimelineCategory;
  rule: TimelineRule;
  sourceShiftId?: string;
}

export interface ClassifiedTimeline {
  intervals: ClassifiedInterval[];
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

export interface MealAllowanceRates {
  small: number;
  large: number;
}
