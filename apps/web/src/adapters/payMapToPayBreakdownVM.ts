import { applyShabbatCreditToSegment, type MonthPayMap } from "@shiftly/domain";
import type { PayBreakdownViewModel } from "@/app/types";
import { calculateActualHours } from "@/utils";

export const payMapToPayBreakdownVM = (
  payMap: MonthPayMap,
  shabbatCreditHours: number,
): PayBreakdownViewModel => ({
  totalHours: payMap.totalHours + shabbatCreditHours,
  actualHours: calculateActualHours(
    payMap.totalHours,
    payMap.hours100Sick.hours,
    payMap.hours100Vacation.hours,
  ),
  regular: payMap.regular,
  extra: payMap.extra,
  special: payMap.special,
  hours100Sick: payMap.hours100Sick,
  hours100Vacation: payMap.hours100Vacation,
  appliedShabbatCredit: applyShabbatCreditToSegment(
    payMap.earnedShabbatCredit,
    shabbatCreditHours,
  ),
  perDiemPoints: payMap.perDiem.points,
  perDiemAmount: payMap.perDiem.amount,
  largePoints: payMap.mealAllowance.large.points,
  largeAmount: payMap.mealAllowance.large.amount,
  smallPoints: payMap.mealAllowance.small.points,
  smallAmount: payMap.mealAllowance.small.amount,
});
