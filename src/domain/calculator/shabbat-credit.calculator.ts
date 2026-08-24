import { WorkDayType } from "@/constants";
import type { Segment, WorkDayMap } from "../types/data-shapes";
import type { WorkDayInfo } from "../types/types";

type ShabbatCreditDayPayMap = Pick<
  WorkDayMap,
  "totalHours" | "earnedShabbatCredit"
>;

export type ShabbatCreditAllocation = {
  earnedHours: number;
  usedHours: number;
  unusedHours: number;
  appliedHoursByDate: Record<string, number>;
};

export const allocateShabbatCredit = (params: {
  workDays: ReadonlyArray<Pick<WorkDayInfo, "meta">>;
  dailyPayMaps: Readonly<Record<string, ShabbatCreditDayPayMap>>;
  standardHours: number;
}): ShabbatCreditAllocation => {
  const earnedHours = Object.values(params.dailyPayMaps).reduce(
    (total, day) => total + day.earnedShabbatCredit.hours,
    0,
  );

  let remainingHours = earnedHours;
  const appliedHoursByDate: Record<string, number> = {};

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
        remainingHours -= appliedHours;
      }
    }
  }

  return {
    earnedHours,
    usedHours: earnedHours - remainingHours,
    unusedHours: remainingHours,
    appliedHoursByDate,
  };
};

export const applyShabbatCreditToSegment = (
  segment: Segment,
  appliedHours: number,
): Segment => ({ ...segment, hours: appliedHours });
