import { CompactPayBreakdownVM, MonthPayMap } from "@/domain";
import { monthToPayBreakdownVM } from "./monthToPayBreakdownVM";
import { calculateActualHours, computeTotalPay } from "@/utils";

export const monthToCompactPayBreakdownVM = (
  month: MonthPayMap,
  baseRate: number,
  shabbatCreditHours: number,
): CompactPayBreakdownVM => {
  const regularHours = month.regular.hours100.hours;

  const extraHours =
    month.regular.hours125.hours + month.regular.hours150.hours;

  const totalHours = month.totalHours;

  const dailySalary =
    baseRate > 0
      ? computeTotalPay(
          monthToPayBreakdownVM(month, shabbatCreditHours),
          baseRate,
        )
      : undefined;

  return {
    totalHours: totalHours + shabbatCreditHours,
    actualHours: calculateActualHours(
      totalHours,
      month.hours100Sick.hours,
      month.hours100Vacation.hours,
    ),
    regularHours,
    extraHours,
    dailySalary,
  };
};
