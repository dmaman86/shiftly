import { WorkDayStatus } from "@/domain/constants";
import type { ShiftRecord } from "@/services/shift/shift.service";
import type { WorkDayRecord } from "@/services/workDay/workDay.service";
import type { WorkTableDayState } from "../../context/workTableDayState/workTableDayStateContext";

export type WorkTableRecords = {
  days: WorkDayRecord[];
  shifts: ShiftRecord[];
};

/**
 * Inverse of `recordsToWorkTableDayState`: serializes editable month state into
 * the persisted record shape. Pay maps are derived data and are rebuilt on load.
 */
export const workTableStateToRecords = (
  state: WorkTableDayState,
): WorkTableRecords => {
  const days: WorkDayRecord[] = [];
  const shifts: ShiftRecord[] = [];

  for (const [date, dayState] of Object.entries(state)) {
    // Row absence means "normal", matching workDayService.setStatus.
    if (dayState.status !== WorkDayStatus.normal) {
      days.push({ date, status: dayState.status });
    }

    for (const { shift } of Object.values(dayState.shiftEntries)) {
      shifts.push({
        id: shift.id,
        date,
        start_time: shift.start.date.toISOString(),
        end_time: shift.end.date.toISOString(),
        is_duty: shift.isDuty,
      });
    }
  }

  return { days, shifts };
};
