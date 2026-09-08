import { WorkDayStatus } from "@/constants";
import type { Shift, ShiftMapBuilder, WorkDayInfo } from "@/domain";
import type { ShiftRecord } from "@/services/shift/shift.service";
import type { WorkDayRecord } from "@/services/workDay/workDay.service";
import type { WorkTableDayState } from "../context/workTableDayState/workTableDayStateContext";

type RecordsToWorkTableDayStateParams = {
  days: WorkDayRecord[];
  shifts: ShiftRecord[];
  workDays: WorkDayInfo[];
  shiftMapBuilder: ShiftMapBuilder;
  standardHours: number;
};

export const recordsToWorkTableDayState = ({
  days,
  shifts,
  workDays,
  shiftMapBuilder,
  standardHours,
}: RecordsToWorkTableDayStateParams): WorkTableDayState => {
  const state: WorkTableDayState = {};

  for (const day of days) {
    state[day.date] = { status: day.status, shiftEntries: {} };
  }

  for (const row of shifts) {
    const meta = workDays.find((day) => day.meta.date === row.date)?.meta;
    if (!meta) continue;

    const shift: Shift = {
      id: row.id,
      start: { date: new Date(row.start_time) },
      end: { date: new Date(row.end_time) },
      isDuty: row.is_duty,
    };
    const payMap = shiftMapBuilder.build({
      shift,
      meta,
      standardHours,
      isFieldDutyShift: shift.isDuty,
    });
    const dayState = state[row.date] ?? {
      status: WorkDayStatus.normal,
      shiftEntries: {},
    };

    state[row.date] = {
      ...dayState,
      shiftEntries: { ...dayState.shiftEntries, [shift.id]: { shift, payMap } },
    };
  }

  return state;
};
