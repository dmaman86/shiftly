import { MonthPayMap, PayBreakdownViewModel } from "@/domain";
import { calculateActualHours } from "@/utils";

export const monthToPayBreakdownVM = (
  month: MonthPayMap,
): PayBreakdownViewModel => ({
  totalHours: month.totalHours,
  actualHours: calculateActualHours(
    month.totalHours,
    month.hours100Sick.hours,
    month.hours100Vacation.hours,
  ),

  regular: month.regular,
  extra: month.extra,
  special: month.special,

  hours100Sick: month.hours100Sick,
  hours100Vacation: month.hours100Vacation,
  extra100Shabbat: month.extra100Shabbat,

  perDiemPoints: month.perDiem.points,
  perDiemAmount: month.perDiem.amount,

  largePoints: month.mealAllowance.large.points,
  largeAmount: month.mealAllowance.large.amount,

  smallPoints: month.mealAllowance.small.points,
  smallAmount: month.mealAllowance.small.amount,
});
