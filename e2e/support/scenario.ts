import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export type WorkDayStatusValue = "normal" | "sick" | "vacation";

export type HolidayItem = {
  date: string;
  title: string;
  category: "holiday";
  yomtov?: boolean;
};

export type ShiftInput = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_duty: boolean;
};

export type MonthInput = {
  year: number;
  month: number;
  baseRate: number;
  standardHours: number;
  timeZone: string;
  holidays?: HolidayItem[];
  statuses: Array<{ date: string; status: WorkDayStatusValue }>;
  shifts: ShiftInput[];
};

export type PayBreakdown = {
  totalHours: number;
  actualHours: number;
  regular: {
    hours100: { hours: number };
    hours125: { hours: number };
    hours150: { hours: number };
  };
  extra: {
    hours20: { hours: number };
    hours50: { hours: number };
  };
  special: {
    shabbat150: { hours: number };
    shabbat200: { hours: number };
  };
  perDiemPoints: number;
  largePoints: number;
  smallPoints: number;
};

export type MonthResult = {
  year: number;
  month: number;
  baseRate: number;
  daily: Record<string, { breakdown: PayBreakdown; salary: number }>;
  monthly: { salary: number; breakdown: PayBreakdown };
};

export type MonthScenario = {
  input: MonthInput;
  expected: MonthResult;
};

const loadJson = <T>(file: string): T =>
  JSON.parse(readFileSync(resolve("e2e/fixtures", file), "utf8")) as T;

/** Loads `e2e/fixtures/<name>.json` and its `<name>.result.json`. */
export const loadMonthScenario = (name: string): MonthScenario => {
  const input = loadJson<MonthInput>(`${name}.json`);
  const expected = loadJson<MonthResult>(`${name}.result.json`);

  if (expected.year !== input.year || expected.month !== input.month) {
    throw new Error(`Fixture ${name}: result month does not match input month`);
  }
  if (expected.baseRate !== input.baseRate) {
    throw new Error(`Fixture ${name}: result baseRate does not match input`);
  }

  return { input, expected };
};

/** Wall-clock HH:mm of an instant in the fixture's time zone. */
export const formatTime = (value: string, timeZone: string) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));

export const isCrossDay = (shift: ShiftInput) =>
  shift.start_time.slice(0, 10) !== shift.end_time.slice(0, 10);

/** Mirrors `formatValue` in src/utils: blank for zero, two decimals otherwise. */
export const formatHours = (value: number) =>
  Math.abs(value) < 0.005 ? "" : roundToCents(value).toFixed(2);

const roundToCents = (value: number) =>
  Math.round((value + Number.EPSILON * Math.max(1, Math.abs(value))) * 100) / 100;

/** Salary as the desktop table renders it (blank when there is no salary). */
export const formatTableSalary = (value: number) =>
  value > 0 ? `₪${roundToCents(value).toFixed(2)}` : "";

/** Salary as the mobile stat tiles render it (em dash when there is no salary). */
export const formatTileSalary = (value: number) =>
  value > 0 ? `₪${roundToCents(value).toFixed(2)}` : "—";
