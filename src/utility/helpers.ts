import { TimeFieldType, WorkDayPayMap, WorkDayType } from "@/models";
import { BreakdownUtils } from "./breakdown.utils";
import { calculateWorkDayBreakdown } from "./workDayBreakdown.utils";

type Segment = {
  id: string;
  start: TimeFieldType;
  end: TimeFieldType;
};

export const calculateSalary = (
  breakdown: WorkDayPayMap,
  baseRate: number,
): number => {
  if (baseRate === 0) return 0;

  const { regular, special, hours100Sick, hours100Vacation } = breakdown;
  const allSegments = [
    ...Object.values(regular),
    ...Object.values(special),
    hours100Sick,
    hours100Vacation,
  ];

  return allSegments.reduce(
    (sum, seg) => sum + seg.hours * seg.percent * baseRate,
    0,
  );
};

export const sortSegments = (segments: Segment[]): Segment[] => {
  return [...segments].sort((a, b) => a.start.minutes - b.start.minutes);
};

export const minutesToTimeStr = (minutes: number): string => {
  const clean = minutes % (24 * 60);
  const hh = String(Math.floor(clean / 60)).padStart(2, "0");
  const mm = String(clean % 60).padStart(2, "0");
  return `${hh}:${mm}`;
};

export const calculateBreakdown = (
  segments: Segment[],
  meta: { date: string; typeDay: WorkDayType; crossDayContinuation: boolean },
  standarHours: number,
  baseRate: number,
): WorkDayPayMap => {
  const breakdown: WorkDayPayMap = BreakdownUtils.initBreakdown();

  segments.forEach(({ start, end }) => {
    calculateWorkDayBreakdown(
      start.minutes,
      end.minutes,
      standarHours,
      breakdown,
      meta,
    );
  });
  breakdown.totalPay = calculateSalary(breakdown, baseRate);
  return breakdown;
};

export const dayOfMonth = (dateStr: string, hebrewDay: string): string => {
  const date = new Date(dateStr);
  const day = date.toLocaleDateString("he-IL", { day: "2-digit" });
  return `${hebrewDay}-${day}`;
};

export const formatValue = (value: number | null | undefined): string => {
  if (value === null || value === undefined || value === 0) return "";
  return value.toFixed(2);
};
