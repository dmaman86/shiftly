import type { DomainContextType } from "@/app";
import {
  type WorkDayMap,
} from "@/domain";
import type { WorkDayInfo } from "@/app/types";
import type { WorkTableDayState } from "../../context/workTableDayState/workTableDayStateContext";

type WorkTableStateToDailyPayMapsParams = {
  domain: DomainContextType;
  state: WorkTableDayState;
  workDays: WorkDayInfo[];
  standardHours: number;
  year: number;
  month: number;
};

export const workTableStateToDailyPayMaps = ({
  domain,
  state,
  workDays,
  standardHours,
  year,
  month,
}: WorkTableStateToDailyPayMapsParams): Record<string, WorkDayMap> => {
  const dailyPayMaps: Record<string, WorkDayMap> = {};

  for (const [dateKey, dayState] of Object.entries(state)) {
    const meta = workDays.find((workDay) => workDay.meta.date === dateKey)?.meta;
    if (!meta) continue;

    const shifts = Object.values(dayState.shiftEntries)
      .filter((entry) => entry.payMap !== null)
      .map((entry) => entry.shift);
    const dayPayMap = domain.payMap.calculateDayFromShifts({
      meta,
      month,
      shifts,
      standardHours,
      status: dayState.status,
      year,
    }).dayPayMap;

    if (dayPayMap.totalHours > 0) dailyPayMaps[dateKey] = dayPayMap;
  }

  return dailyPayMaps;
};
