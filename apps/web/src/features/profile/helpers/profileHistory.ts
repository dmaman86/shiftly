import { allocateShabbatCredit } from "@shiftly/domain";
import type { DomainContextType, ReferenceIssue } from "@/app";
import type { PayBreakdownViewModel, WorkDayInfo } from "@/app/types";
import { monthToPayBreakdownVM } from "@/adapters";
import type { MonthlyConfigRecord } from "@/services/monthlyConfig/monthlyConfig.service";
import type { ShiftRecord } from "@/services/shift/shift.service";
import type { WorkDayRecord } from "@/services/workDay/workDay.service";
import { calculateGlobalBreakdown } from "@/store/globalBreakdown";
import { defaultMonthlyConfig } from "@/store/globalStore";
import { recordsToWorkTableDayState } from "@/features/work-table/mappers/month/recordsToWorkTableDayState";
import { workTableStateToDailyPayMaps } from "@/features/work-table/mappers/month/workTableStateToDailyPayMaps";
import type { ProfileMonth } from "./profileRange";

export type { ProfileMonth, ProfileRange } from "./profileRange";
export { getProfileMonths } from "./profileRange";
export type ProfileMonthSnapshot = ProfileMonth & {
  /** null without records, or when a rate the month needs is unavailable. */
  breakdown: PayBreakdownViewModel | null;
  baseRate: number;
  usesDefaultConfig: boolean;
  /** Rates the month needs that are unavailable; it is then not calculated. */
  referenceIssues: ReferenceIssue[];
};

export const calculateProfileMonth = ({
  domain,
  period,
  config,
  carriedOverHours,
  days,
  shifts,
  workDays,
}: {
  domain: DomainContextType;
  period: ProfileMonth;
  config: MonthlyConfigRecord | null;
  carriedOverHours: number;
  days: WorkDayRecord[];
  shifts: ShiftRecord[];
  workDays: WorkDayInfo[];
}): ProfileMonthSnapshot => {
  const standardHours =
    config?.standard_hours ?? defaultMonthlyConfig.standardHours;
  const baseRate = config?.base_rate ?? defaultMonthlyConfig.baseRate;
  const hasRecords =
    days.length > 0 || shifts.length > 0 || carriedOverHours > 0;
  if (!hasRecords) {
    return {
      ...period,
      breakdown: null,
      baseRate,
      usesDefaultConfig: false,
      referenceIssues: [],
    };
  }
  const referenceIssues = domain.references.monthIssues(
    period.year,
    period.month,
  );
  if (referenceIssues.length > 0) {
    return {
      ...period,
      breakdown: null,
      baseRate,
      usesDefaultConfig: config === null,
      referenceIssues,
    };
  }

  const state = recordsToWorkTableDayState({
    days,
    shifts,
    workDays,
    standardHours,
    shiftMapBuilder: domain.payMap.shiftMapBuilder,
    dateService: domain.services.dateService,
  });
  const dailyPayMaps = workTableStateToDailyPayMaps({
    domain,
    state,
    workDays,
    standardHours,
    ...period,
  });
  const allocation = allocateShabbatCredit({
    workDays,
    dailyPayMaps,
    standardHours,
    carriedOverHours,
  });
  const monthPayMap = calculateGlobalBreakdown(
    dailyPayMaps,
    domain.payMap.monthPayMapCalculator,
  );

  return {
    ...period,
    baseRate,
    usesDefaultConfig: config === null,
    breakdown: monthToPayBreakdownVM(monthPayMap, allocation.usedHours),
    referenceIssues: [],
  };
};
