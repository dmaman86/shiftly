import { WorkDayType } from "@/constants";

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
  regular: RegularBreakdown,
  extra: ExtraBreakdown,
  special: SpecialBreakdown,
  totalHours: number,
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

export interface WorkPayMap {
  regular: RegularBreakdown;
  extra: ExtraBreakdown;
  special: SpecialBreakdown;
  hours100Sick: Segment;
  hours100Vacation: Segment;
  extra100Shabbat: Segment;
  totalHours: number;
  baseRate: number;
  rateDiem: number;

  perDiem: DailyPerDiemInfo;
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

export interface WorkDayRowProps {
  date: string;
  addToGlobalBreakdown: (b: WorkPayMap) => void;
  subtractFromGlobalBreakdown: (b: WorkPayMap) => void;
  standardHours: number;
  baseRate: number;
}

export interface ApiResponse<T = any> {
  data: T | null;
  error: string | null;
}

export interface WorkDaysState {
  year: number | null;
  month: number | null;
  workDays: WorkDayInfo[];
}

export interface GlobalBreakdownState {
  globalBreakdown: WorkPayMap;
  baseRate: number;
}