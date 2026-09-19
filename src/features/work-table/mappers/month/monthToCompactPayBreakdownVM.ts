import { CompactPayBreakdownVM, PayBreakdownViewModel } from "@/domain";
import { computeTotalPay } from "@/utils";

export const monthToCompactPayBreakdownVM = (
  month: PayBreakdownViewModel,
  baseRate: number,
): CompactPayBreakdownVM => {
  const regularHours = month.regular.hours100.hours;

  const extraHours =
    month.regular.hours125.hours + month.regular.hours150.hours;

  const dailySalary =
    baseRate > 0
      ? computeTotalPay(month, baseRate)
      : undefined;

  return {
    totalHours: month.totalHours,
    actualHours: month.actualHours,
    regularHours,
    extraHours,
    dailySalary,
  };
};
