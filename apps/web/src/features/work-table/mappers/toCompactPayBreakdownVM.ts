import type { CompactPayBreakdownVM, PayBreakdownViewModel } from "@/app/types";
import { computeTotalPay } from "@/utils";

// Derives the compact table view from the full view model so day and month
// totals share a single source and cannot drift from the detailed breakdown.
export const toCompactPayBreakdownVM = (
  breakdown: PayBreakdownViewModel,
  baseRate: number,
): CompactPayBreakdownVM => ({
  totalHours: breakdown.totalHours,
  actualHours: breakdown.actualHours,
  regularHours: breakdown.regular.hours100.hours,
  extraHours:
    breakdown.regular.hours125.hours + breakdown.regular.hours150.hours,
  dailySalary: baseRate > 0 ? computeTotalPay(breakdown, baseRate) : undefined,
});
