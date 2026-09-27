import { WorkDayType, HolidayKey } from "../constants";

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

/**
 * A shift represented on one continuous minute axis, before salary rules are
 * applied. The axis starts at the shift's calendar day midnight.
 */
export interface NormalizedShiftTimeline {
  sourceShiftId: string;
  point: Point;
}

export interface TimelineInterval {
  point: Point;
  category: TimelineCategory;
  calendarDate: string;
  dayOffset: number;
  sourceShiftId?: string;
}

export interface TimelineSlice extends TimelineInterval {
  localPoint: Point;
}

export type TimelineCategory = "regular" | "special";

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

export interface EndpointCall<T> {
  call: () => Promise<ApiResponse<T>>;
  controller?: AbortController;
}

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
