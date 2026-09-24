import { WorkDayType } from "@/domain/constants";
import type { Segment, WorkDayMap } from "../types/data-shapes";
import type { DomainWorkDay } from "../types/types";

type ShabbatCreditDayPayMap = Pick<
  WorkDayMap,
  "totalHours" | "earnedShabbatCredit"
>;

export type ShabbatCreditAllocation = {
  carriedOverHours: number;
  earnedHours: number;
  totalAvailableHours: number;
  usedHours: number;
  unusedHours: number;
  appliedHoursByDate: Record<string, number>;
  usageByDate: Record<string, ShabbatCreditUsage>;
};

export type ShabbatCreditSource = {
  source: "day" | "previous-month";
  date?: string;
  hours: number;
};

export type ShabbatCreditUsage = {
  totalHours: number;
  sources: ShabbatCreditSource[];
};

export const allocateShabbatCredit = (params: {
  workDays: ReadonlyArray<Pick<DomainWorkDay, "meta">>;
  dailyPayMaps: Readonly<Record<string, ShabbatCreditDayPayMap>>;
  standardHours: number;
  carriedOverHours?: number;
}): ShabbatCreditAllocation => {
  const carriedOverHours = params.carriedOverHours ?? 0;
  const earnedHours = Object.values(params.dailyPayMaps).reduce(
    (total, day) => total + day.earnedShabbatCredit.hours,
    0,
  );
  const totalAvailableHours = carriedOverHours + earnedHours;

  let remainingHours = totalAvailableHours;
  const appliedHoursByDate: Record<string, number> = {};
  const usageByDate: Record<string, ShabbatCreditUsage> = {};
  const sources: ShabbatCreditSource[] = [
    ...(carriedOverHours > 0
      ? [{ source: "previous-month" as const, hours: carriedOverHours }]
      : []),
    ...Object.entries(params.dailyPayMaps)
      .filter(([, day]) => day.earnedShabbatCredit.hours > 0)
      .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
      .map(([date, day]) => ({
        source: "day" as const,
        date,
        hours: day.earnedShabbatCredit.hours,
      })),
  ];

  const chronologicalDays = [...params.workDays].sort((a, b) =>
    a.meta.date.localeCompare(b.meta.date),
  );

  for (const { meta } of chronologicalDays) {
    if (remainingHours <= 0) break;

    const canReceiveCredit =
      meta.typeDay === WorkDayType.Regular ||
      meta.typeDay === WorkDayType.SpecialPartialStart;

    if (canReceiveCredit) {
      const accountedHours = params.dailyPayMaps[meta.date]?.totalHours ?? 0;
      const missingHours = Math.max(params.standardHours - accountedHours, 0);
      const appliedHours = Math.min(missingHours, remainingHours);

      if (appliedHours > 0) {
        appliedHoursByDate[meta.date] = appliedHours;
        let remainingForDay = appliedHours;
        const usageSources: ShabbatCreditSource[] = [];

        for (const source of sources) {
          if (remainingForDay <= 0 || source.hours <= 0) continue;

          const sourceHours = Math.min(source.hours, remainingForDay);
          usageSources.push({
            source: source.source,
            ...(source.date ? { date: source.date } : {}),
            hours: sourceHours,
          });
          source.hours -= sourceHours;
          remainingForDay -= sourceHours;
        }

        usageByDate[meta.date] = {
          totalHours: appliedHours,
          sources: usageSources,
        };
        remainingHours -= appliedHours;
      }
    }
  }

  return {
    carriedOverHours,
    earnedHours,
    totalAvailableHours,
    usedHours: totalAvailableHours - remainingHours,
    unusedHours: remainingHours,
    appliedHoursByDate,
    usageByDate,
  };
};

export const applyShabbatCreditToSegment = (
  segment: Segment,
  appliedHours: number,
): Segment => ({ ...segment, hours: appliedHours });
