import { CompactPayBreakdownVM, WorkDayMap } from "@/domain";
import { dayToPayBreakdownVM } from "./dayToPayBreakdownVM";
import { calculateActualHours, computeTotalPay } from "@/utils";

export const dayToCompactPayBreakdownVM = (
  day: WorkDayMap,
  baseRate: number,
): CompactPayBreakdownVM => {
  const dailySalary =
    baseRate > 0
      ? computeTotalPay(dayToPayBreakdownVM(day), baseRate)
      : undefined;

  const regularHours = day.workMap.regular.hours100.hours;

  const extraHours =
    day.workMap.regular.hours125.hours + day.workMap.regular.hours150.hours;

  return {
    totalHours: day.totalHours,
    actualHours: calculateActualHours(
      day.totalHours,
      day.hours100Sick.hours,
      day.hours100Vacation.hours,
    ),
    regularHours,
    extraHours,
    dailySalary,
  };
};
