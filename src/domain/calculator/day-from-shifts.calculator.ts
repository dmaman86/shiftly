import { WorkDayStatus } from "@/constants";
import type {
  DayPayMapBuilder,
  Shift,
  ShiftMapBuilder,
  ShiftPayMap,
  WorkDayMap,
  WorkDayMeta,
} from "@/domain";

type CalculateDayFromShiftsParams = {
  dayPayMapBuilder: DayPayMapBuilder;
  meta: WorkDayMeta;
  month: number;
  shifts: Shift[];
  shiftMapBuilder: ShiftMapBuilder;
  standardHours: number;
  status?: WorkDayStatus;
  year: number;
};

type DayFromShiftsCalculation = {
  dayPayMap: WorkDayMap;
  shiftPayMaps: ShiftPayMap[];
};

export const calculateDayFromShifts = ({
  dayPayMapBuilder,
  meta,
  month,
  shifts,
  shiftMapBuilder,
  standardHours,
  status = WorkDayStatus.normal,
  year,
}: CalculateDayFromShiftsParams): DayFromShiftsCalculation => {
  const shiftPayMaps = shifts.map((shift) =>
    shiftMapBuilder.build({
      isFieldDutyShift: shift.isDuty,
      meta,
      shift,
      standardHours,
    }),
  );

  return {
    dayPayMap: dayPayMapBuilder.build({
      meta,
      month,
      shifts: shiftPayMaps,
      standardHours,
      status,
      year,
    }),
    shiftPayMaps,
  };
};
