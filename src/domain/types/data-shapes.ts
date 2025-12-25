import { MealAllowanceDayInfo } from "./bundles";
import { WorkDayMeta } from "./types";

export type HeaderWithChildren = {
  label: string;
  children: string[];
  rowSpan?: never;
};

export type HeaderSingle = {
  label: string;
  rowSpan?: number;
  children?: never;
};

export type TableHeader = HeaderWithChildren | HeaderSingle;

// --- Primitives ---
export interface Segment {
  percent: number;
  hours: number;
}

export type TimeFieldType = { date: Date; minutes: number };

export type Shift = {
  id: string;
  start: TimeFieldType;
  end: TimeFieldType;
};

// --- Breakdowns ---
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

// --- Per Diem & Meals ---
export interface PerDiemInfo {
  tier: "A" | "B" | "C" | null;
  points: number;
  amount: number;
}

export interface DailyPerDiemInfo {
  isFieldDutyDay: boolean;
  diemInfo: PerDiemInfo;
}

export interface MealAllowanceEntry {
  points: number;
  amount: number;
}

export interface MealAllowance {
  small: MealAllowanceEntry;
  large: MealAllowanceEntry;
}

// Commons fields for shift, day, month
export interface BasePayMap {
  regular: RegularBreakdown;
  extra: ExtraBreakdown;
  special: SpecialBreakdown;
  totalHours: number;
}

// shift level
export interface ShiftPayMap extends BasePayMap {
  perDiemShift: { isFieldDutyShift: boolean; hours: number };
}

// day level
export interface WorkDayMap {
  workMap: BasePayMap;
  hours100Sick: Segment;
  hours100Vacation: Segment;
  extra100Shabbat: Segment;
  perDiem: DailyPerDiemInfo;
  mealAllowance: MealAllowance;
  totalHours: number;
}

// month level
export interface MonthPayMap {
  hours100Sick: Segment;
  hours100Vacation: Segment;
  extra100Shabbat: Segment;
  perDiem: PerDiemInfo;
  mealAllowance: MealAllowance;
  regular: RegularBreakdown;
  extra: ExtraBreakdown;
  special: SpecialBreakdown;
  totalHours: number;
}

export interface RegularConfig {
  midTierThreshold: number;
  percentages: {
    hours100: number;
    hours125: number;
    hours150: number;
  };
}

export type RegularInput = {
  totalHours: number;
  standardHours: number;
  meta: WorkDayMeta;
};

export type MealAllowanceCalcParams = {
  day: MealAllowanceDayInfo;
  rate: number;
};

export type WorkPayPart = Pick<MonthPayMap, "regular" | "extra" | "special">;
