import { MonthPayMap, PayBreakdownViewModel } from "@/domain";

export const monthToPayBreakdownVM = (
  month: MonthPayMap,
): PayBreakdownViewModel => ({
  totalHours: month.totalHours,

  regular: month.regular,
  extra: month.extra,
  special: month.special,

  hours100Sick: month.hours100Sick,
  hours100Vacation: month.hours100Vacation,
  extra100Shabbat: month.extra100Shabbat,

  perDiemPoints: month.perDiem.points,
  perDiemAmount: month.perDiem.amount,
});
