import { WorkDayMeta } from "./types";
import type { ClassifiedTimeline } from "./types";

// --- Primitives ---
export interface Segment {
  percent: number;
  hours: number;
}

export type TimeFieldType = { date: Date };

export type Shift = {
  id: string;
  start: TimeFieldType;
  end: TimeFieldType;
  isDuty: boolean;
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
  classifiedTimeline: ClassifiedTimeline;
}

// day level
export interface WorkDayMap {
  workMap: BasePayMap;
  classifiedTimeline?: ClassifiedTimeline;
  hours100Sick: Segment;
  hours100Vacation: Segment;
  earnedShabbatCredit: Segment;
  perDiem: DailyPerDiemInfo;
  mealAllowance: MealAllowance;
  totalHours: number;
}

// month level
export interface MonthPayMap {
  hours100Sick: Segment;
  hours100Vacation: Segment;
  earnedShabbatCredit: Segment;
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

export type WorkPayPart = Pick<MonthPayMap, "regular" | "extra" | "special">;
