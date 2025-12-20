import { WorkDayStatus, WorkDayType } from "@/constants";

export interface TimeFieldType {
  date: Date;
  minutes: number;
}

export type Shift = {
  id: string;
  start: TimeFieldType;
  end: TimeFieldType;
};

export type Segment = {
  percent: number;
  hours: number;
};

export interface RegularBreakdown {
  hours100: Segment;
  hours125: Segment;
  hours150: Segment;
}

export interface ExtraBreakdown {
  hours20: Segment;
  hours50: Segment;
}

export interface SpecialBreakdown {
  shabbat150: Segment;
  shabbat200: Segment;
}

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

export interface PerDiemInfo {
  tier: "A" | "B" | "C" | null;
  points: number;
  amount: number;
}

export interface DailyPerDiemInfo {
  isFieldDutyDay: boolean;
  diemInfo: PerDiemInfo;
}

export interface DayShift {
  id: string;
  shift: Shift;
  breakdown: WorkDayMapByShift;
  perDiemShift: DailyPerDiemInfo;
}

export interface WorkDayMap {
  workMap: {
    regular: RegularBreakdown;
    extra: ExtraBreakdown;
    special: SpecialBreakdown;
    totalHours: number;
  };
  hours100Sick: Segment;
  hours100Vacation: Segment;
  extra100Shabbat: Segment;
  perDiem: DailyPerDiemInfo;
  totalHours: number;
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

export interface ApiResponse<T = any> {
  data: T | null;
  error: string | null;
}

// ------------------
export interface RegularCalculator {
  createEmpty(): RegularBreakdown;
  calculate(
    totalHours: number,
    standardHours: number,
    meta: WorkDayMeta,
  ): RegularBreakdown;
}

export interface RegularReducer {
  createEmpty(): RegularBreakdown;
  add(base: RegularBreakdown, add: RegularBreakdown): RegularBreakdown;
  sub(base: RegularBreakdown, sub: RegularBreakdown): RegularBreakdown;
}

export interface RegularAccumulator {
  createEmpty(): RegularBreakdown;
  accumulateRegular(
    base: RegularBreakdown,
    add: RegularBreakdown,
  ): RegularBreakdown;
  subtractRegular(
    base: RegularBreakdown,
    sub: RegularBreakdown,
  ): RegularBreakdown;
}

export interface SegmentBasedCalculator<T> {
  createEmpty(): T;
  calculate(labelSegments: LabeledSegmentRange[]): T;
  accumulate(base: T, add: T): T;
  subtract(base: T, sub: T): T;
}

export interface DayInfoResolver {
  isSpecialFullDay(day: WorkDayInfo): boolean;
  isPartialHolidayStart(day: WorkDayInfo): boolean;
  hasCrossDayContinuation(day: WorkDayInfo): boolean;
  formatHebrewWorkDay(day: WorkDayInfo): string;
}

export interface PerDiemRateResolver {
  getRateForRate(year: number, month: number): number;
}

export interface PerDiemShiftCalculator {
  createEmpty(): PerDiemShiftInfo;
  calculate(shift: Shift, isFieldDutyShift: boolean): PerDiemShiftInfo;
}

export interface PerDiemDayCalculator {
  calculate(params: {
    shifts: PerDiemShiftInfo[];
    rate: number;
  }): DailyPerDiemInfo;
}

export interface PerDiemMonthCalculator {
  createEmpty(): PerDiemInfo;
  accumulate(base: PerDiemInfo, add: PerDiemInfo): PerDiemInfo;
  subtract(base: PerDiemInfo, sub: PerDiemInfo): PerDiemInfo;
}

export interface ShiftPayMap {
  regular: RegularBreakdown;
  extra: ExtraBreakdown;
  special: SpecialBreakdown;
  totalHours: number;
  perDiemShift: PerDiemShiftInfo;
}

export interface WorkDaysForMonthBuilder {
  build(params: {
    year: number;
    month: number;
    eventMap: Record<string, string[]>;
  }): WorkDayInfo[];
}

export interface ShiftMapBuilder {
  build(params: {
    shift: Shift;
    meta: WorkDayMeta;
    standardHours: number;
    isFieldDutyShift: boolean;
  }): ShiftPayMap;
}

export interface DayPayMapBuilder {
  build(params: {
    shifts: ShiftPayMap[];
    status: WorkDayStatus;
    meta: WorkDayMeta;
    standardHours: number;
    year: number;
    month: number;
  }): WorkDayMap;
}

export interface MonthPayMap {
  regular: RegularBreakdown;
  extra: ExtraBreakdown;
  special: SpecialBreakdown;
  hours100Sick: Segment;
  hours100Vacation: Segment;
  extra100Shabbat: Segment;
  perDiem: PerDiemInfo;
  totalHours: number;
}

export interface MonthPayMapCalculator {
  createEmpty(): MonthPayMap;
  accumulate(base: MonthPayMap, add: WorkDayMap): MonthPayMap;
  subtract(base: MonthPayMap, sub: WorkDayMap): MonthPayMap;
}

export interface HolidayResolver {
  resolve(params: { weekday: number; eventTitles: string[] }): WorkDayType;
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
};

export interface MonthResolver {
  getAvailableMonthOptions(year: number): { value: number; label: string }[];
  getAvailableMonths(year: number): number[];
  resolveDefaultMonth(year: number): number;
  getMonthName(monthIndex: number): string;
  getAllMonthNames(): string[];
  getCurrentYear(): number;
}
