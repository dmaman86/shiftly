import type { CompactPayBreakdownVM } from "@/app/types";
import { WorkDayMap } from "@shiftly/domain";
import { dayToPayBreakdownVM } from "@/adapters";
import { toCompactPayBreakdownVM } from "../toCompactPayBreakdownVM";

export const dayToCompactPayBreakdownVM = (
  day: WorkDayMap,
  baseRate: number,
  shabbatCreditHours: number,
): CompactPayBreakdownVM =>
  toCompactPayBreakdownVM(
    dayToPayBreakdownVM(day, shabbatCreditHours),
    baseRate,
  );
