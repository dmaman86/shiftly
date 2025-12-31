import { CompactPayBreakdownVM, MonthPayMap } from "@/domain";
import { monthToPayBreakdownVM } from "./monthToPayBreakdownVM";
import { computeTotalPay } from "@/utils";

export const monthToCompactPayBreakdownVM = (
  month: MonthPayMap,
  baseRate: number,
): CompactPayBreakdownVM => {
  const regularHours = month.regular.hours100.hours;

  const extraHours = month.totalHours - regularHours;

  const totalHours = month.totalHours;

  const dailySalary =
    baseRate > 0
      ? computeTotalPay(monthToPayBreakdownVM(month), baseRate)
      : undefined;

  return {
    totalHours,
    regularHours,
    extraHours,
    dailySalary,
  };
};
