import { allocateShabbatCredit } from "@shiftly/domain";
import type { DomainContextType } from "@/app";
import type { PayBreakdownViewModel, WorkDayInfo } from "@/app/types";
import { monthToPayBreakdownVM } from "@/adapters";
import { monthlyConfigService, shiftService, workDayService } from "@/services";
import type { MonthlyConfigRecord } from "@/services/monthlyConfig/monthlyConfig.service";
import type { ShiftRecord } from "@/services/shift/shift.service";
import type { WorkDayRecord } from "@/services/workDay/workDay.service";
import { loadCalendarEventMap } from "@/hooks/useWorkDays";
import { calculateGlobalBreakdown } from "@/store/globalBreakdown";
import { defaultMonthlyConfig } from "@/store/globalStore";
import { recordsToWorkTableDayState } from "@/features/work-table/mappers/month/recordsToWorkTableDayState";
import { workTableStateToDailyPayMaps } from "@/features/work-table/mappers/month/workTableStateToDailyPayMaps";
import { getProfileMonths, type ProfileMonth, type ProfileRange } from "./profileRange";

export type { ProfileMonth, ProfileRange } from "./profileRange";
export { getProfileMonths } from "./profileRange";
export type ProfileMonthSnapshot = ProfileMonth & {
  breakdown: PayBreakdownViewModel | null;
  baseRate: number;
  usesDefaultConfig: boolean;
};

export const calculateProfileMonth = ({
  domain, period, config, carriedOverHours, days, shifts, workDays,
}: {
  domain: DomainContextType;
  period: ProfileMonth;
  config: MonthlyConfigRecord | null;
  carriedOverHours: number;
  days: WorkDayRecord[];
  shifts: ShiftRecord[];
  workDays: WorkDayInfo[];
}): ProfileMonthSnapshot => {
  const standardHours = config?.standard_hours ?? defaultMonthlyConfig.standardHours;
  const baseRate = config?.base_rate ?? defaultMonthlyConfig.baseRate;
  const hasRecords = days.length > 0 || shifts.length > 0 || carriedOverHours > 0;
  if (!hasRecords) {
    return { ...period, breakdown: null, baseRate, usesDefaultConfig: false };
  }

  const state = recordsToWorkTableDayState({
    days, shifts, workDays, standardHours,
    shiftMapBuilder: domain.payMap.shiftMapBuilder,
    dateService: domain.services.dateService,
  });
  const dailyPayMaps = workTableStateToDailyPayMaps({
    domain, state, workDays, standardHours, ...period,
  });
  const allocation = allocateShabbatCredit({
    workDays, dailyPayMaps, standardHours, carriedOverHours,
  });
  const monthPayMap = calculateGlobalBreakdown(
    dailyPayMaps, domain.payMap.monthPayMapCalculator,
  );

  return {
    ...period, baseRate, usesDefaultConfig: config === null,
    breakdown: monthToPayBreakdownVM(monthPayMap, allocation.usedHours),
  };
};

/** Read-only projection: never hydrate the editor store or persist carry-over. */
export const loadProfileHistory = async (
  userId: string,
  range: ProfileRange,
  domain: DomainContextType,
  loadWorkDays: (period: ProfileMonth) => Promise<WorkDayInfo[]> = async (period) => {
    const range = domain.services.dateService.getDatesRange(period.year, period.month);
    const eventMap = await loadCalendarEventMap(range.startDate, range.endDate);
    return domain.payMap.workDaysMonthBuilder.build({ ...period, eventMap });
  },
  signal?: AbortSignal,
): Promise<ProfileMonthSnapshot[]> => {
  signal?.throwIfAborted();
  const months = getProfileMonths(range);
  const first = months[0];
  const previous = domain.services.dateService.getPreviousMonth(first.year, first.month);
  const fetchConfig = async (period: ProfileMonth) => {
    signal?.throwIfAborted();
    const result = await monthlyConfigService().fetch(userId, period.year, period.month).call();
    if (result.error !== undefined) throw new Error(result.error);
    return result.data;
  };
  let precedingConfig = await fetchConfig(previous);
  const snapshots: ProfileMonthSnapshot[] = [];

  // A custom range can span years. Bound fan-out instead of firing every month at once.
  for (let offset = 0; offset < months.length; offset += 3) {
    signal?.throwIfAborted();
    const batch = months.slice(offset, offset + 3);
    const configs = await Promise.all(batch.map(fetchConfig));
    signal?.throwIfAborted();
    const batchSnapshots = await Promise.all(batch.map(async (period, index) => {
      const { startDate, endDate } = domain.services.dateService.getDatesRange(period.year, period.month);
      const [daysResult, shiftsResult] = await Promise.all([
        workDayService().fetchForMonth(userId, startDate, endDate).call(),
        shiftService().fetchForMonth(userId, startDate, endDate).call(),
      ]);
      signal?.throwIfAborted();
      if (daysResult.error !== undefined) throw new Error(daysResult.error);
      if (shiftsResult.error !== undefined) throw new Error(shiftsResult.error);
      const config = configs[index];
      const carriedOverHours = (index === 0 ? precedingConfig : configs[index - 1])?.unused_shabbat_credit_hours ?? 0;
      const days = daysResult.data;
      const shifts = shiftsResult.data;
      const workDays = days.length || shifts.length || carriedOverHours > 0
        ? await loadWorkDays(period)
        : [];
      signal?.throwIfAborted();
      return calculateProfileMonth({ domain, period, config, carriedOverHours, days, shifts, workDays });
    }));
    snapshots.push(...batchSnapshots);
    precedingConfig = configs[configs.length - 1];
  }
  signal?.throwIfAborted();
  return snapshots;
};
