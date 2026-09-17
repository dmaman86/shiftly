import {
  applyShabbatCreditToSegment,
  WorkDayMap,
  PayBreakdownViewModel,
} from "@/domain";
import { calculateActualHours } from "@/utils";

export const dayToPayBreakdownVM = (
  day: WorkDayMap,
  shabbatCreditHours: number,
): PayBreakdownViewModel => ({
  totalHours: day.totalHours + shabbatCreditHours,
  actualHours: calculateActualHours(
    day.totalHours,
    day.hours100Sick.hours,
    day.hours100Vacation.hours,
  ),

  regular: day.workMap.regular,
  extra: day.workMap.extra,
  special: day.workMap.special,

  hours100Sick: day.hours100Sick,
  hours100Vacation: day.hours100Vacation,
  appliedShabbatCredit: applyShabbatCreditToSegment(
    day.earnedShabbatCredit,
    shabbatCreditHours,
  ),

  perDiemPoints: day.perDiem.diemInfo.points,
  perDiemAmount: day.perDiem.diemInfo.amount,

  largePoints: day.mealAllowance.large.points,
  largeAmount: day.mealAllowance.large.amount,

  smallPoints: day.mealAllowance.small.points,
  smallAmount: day.mealAllowance.small.amount,
});
