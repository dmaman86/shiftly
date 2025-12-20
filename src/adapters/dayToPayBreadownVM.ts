import { NewWorkDayMap, PayBreakdownViewModel } from "@/domain";

export const dayToPayBreakdownVM = (
  day: NewWorkDayMap,
): PayBreakdownViewModel => ({
  totalHours: day.totalHours,

  regular: day.workMap.regular,
  extra: day.workMap.extra,
  special: day.workMap.special,

  hours100Sick: day.hours100Sick,
  hours100Vacation: day.hours100Vacation,
  extra100Shabbat: day.extra100Shabbat,

  perDiemPoints: day.perDiem.diemInfo.points,
  perDiemAmount: day.perDiem.diemInfo.amount,
});
