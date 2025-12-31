import { CompactPayBreakdownVM, WorkDayMap } from "@/domain";
import { dayToPayBreakdownVM } from "./dayToPayBreakdownVM";
import { computeTotalPay } from "@/utils";

export const dayToCompactPayBreakdownVM = (
  day: WorkDayMap,
  baseRate: number,
): CompactPayBreakdownVM => {
  const hasSick = day.hours100Sick.hours > 0;
  const hasVacation = day.hours100Vacation.hours > 0;

  const dailySalary =
    baseRate > 0
      ? computeTotalPay(dayToPayBreakdownVM(day), baseRate)
      : undefined;

  if (hasSick || hasVacation) {
    const paidHours = hasSick
      ? day.hours100Sick.hours
      : day.hours100Vacation.hours;
    return {
      totalHours: paidHours,
      regularHours: 0,
      extraHours: 0,
      dailySalary,
    };
  }

  const regularHours = day.workMap.regular.hours100.hours;

  const extraHours = day.totalHours - regularHours;

  return {
    totalHours: day.totalHours,
    regularHours,
    extraHours,
    dailySalary,
  };
};
