import { WorkDayType } from "@/constants";

export interface TimeFieldType {
  date: Date;
  minutes: number;
}

export type Segment = {
  id: string;
  start: TimeFieldType;
  end: TimeFieldType;
};

export type PaySegment = {
  percent: number;
  hours: number;
  getRate: (baseRate: number) => number;
  getTotal: (baseRate: number) => number;
};

export interface SpecialBreakdown {
  shabbat150: PaySegment;
  shabbat200: PaySegment;
}

export interface RegularBreakdown {
  hours100: PaySegment;
  hours125: PaySegment;
  hours150: PaySegment;
}

export interface ExtraBreakdown {
  hours20: PaySegment;
  hours50: PaySegment;
}

export interface WorkDayPayMap {
  regular: RegularBreakdown;
  extra: ExtraBreakdown;
  special: SpecialBreakdown;
  hours100Sick: PaySegment;
  hours100Vacation: PaySegment;
  extra100Shabbat: PaySegment;
  totalHours: number;
  baseRate: number;
  getTotalPay: () => number;
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
  key: SegmentKey;
}

export interface WorkDayInfo {
  meta: WorkDayMeta;
  hebrewDay: string;
}

export interface WorkDayRowProps {
  meta: WorkDayMeta;
  hebrewDay: string;
  addToGlobalBreakdown: (b: WorkDayPayMap) => void;
  subtractFromGlobalBreakdown: (b: WorkDayPayMap) => void;
  standardHours: number;
  baseRate: number;
}

export interface ApiResponse<T = any> {
  data: T | null;
  error: string | null;
}
