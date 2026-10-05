import { WorkDayStatus } from "@shiftly/domain";
import { DateService, type Shift, type ShiftMapBuilder } from "@shiftly/domain";
import type { WorkDayInfo } from "@/app/types";
import type { ShiftRecord } from "@/services/shift/shift.service";
import type { WorkDayRecord } from "@/services/workDay/workDay.service";
import type { WorkTableDayState } from "../../context/workTableDayState/workTableDayStateContext";

type RecordsToWorkTableDayStateParams = {
  days: WorkDayRecord[];
  shifts: ShiftRecord[];
  workDays: WorkDayInfo[];
  shiftMapBuilder: ShiftMapBuilder;
  standardHours: number;
  dateService?: DateService;
};

export const recordsToWorkTableDayState = ({
  days,
  shifts,
  workDays,
  shiftMapBuilder,
  standardHours,
  dateService = new DateService(),
}: RecordsToWorkTableDayStateParams): WorkTableDayState => {
  const state: WorkTableDayState = {};

  for (const day of days) {
    state[day.date] = { status: day.status, shiftEntries: {} };
  }

  // Insertion order into shiftEntries becomes display order, so days with
  // multiple shifts need them sorted ascending by start time before insertion.
  const sortedShifts = [...shifts].sort(
    (a, b) =>
      new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
  );

  for (const row of sortedShifts) {
    const meta = workDays.find((day) => day.meta.date === row.date)?.meta;
    if (!meta) continue;

    const shift: Shift = {
      id: row.id,
      start: { date: dateService.createDateFromPersisted(row.start_time) },
      end: { date: dateService.createDateFromPersisted(row.end_time) },
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
