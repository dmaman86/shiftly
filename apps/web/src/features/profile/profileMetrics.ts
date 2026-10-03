import type { useTranslation } from "react-i18next";
import type { DomainContextType } from "@/app";
import {
  buildAllowanceRows, buildBasePayRows, buildExtraPayRows,
} from "@/features/salary-summary/mappers/payRows.mapper";
import { calculateTotal } from "@/features/salary-summary/helpers/helper";
import type { ProfileMonthSnapshot } from "./profileHistory";

export const getProfileMetrics = (
  snapshot: ProfileMonthSnapshot,
  domain: DomainContextType,
  t: ReturnType<typeof useTranslation<"work-table">>["t"],
) => {
  const vm = snapshot.breakdown;
  if (!vm) return null;
  const baseHours = vm.regular.hours100.hours;
  const overtimeHours = vm.regular.hours125.hours + vm.regular.hours150.hours;
  // Match the unedited salary summary's three sections, including full OT pay.
  const payment = snapshot.baseRate > 0 ? {
    base: calculateTotal(buildBasePayRows(vm, snapshot.baseRate, t)),
    extras: calculateTotal(buildExtraPayRows(vm, snapshot.baseRate, t)),
    allowances: calculateTotal(buildAllowanceRows(
      vm,
      domain.resolvers.mealAllowanceRateResolver.calculateRates(snapshot),
      domain.resolvers.perDiemResolver.calculateRate(snapshot),
      t,
    )),
  } : null;

  return {
    actualHours: vm.actualHours, payableHours: vm.totalHours,
    baseHours, overtimeHours, payment,
    totalPayment: payment ? payment.base + payment.extras + payment.allowances : null,
  };
};
