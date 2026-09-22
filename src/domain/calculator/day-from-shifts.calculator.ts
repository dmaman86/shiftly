import { WorkDayStatus } from "@/domain/constants";
import type { DayPayMapBuilder, ShiftMapBuilder } from "../types/services";
import type { Shift, ShiftPayMap, WorkDayMap } from "../types/data-shapes";
import type { WorkDayMeta } from "../types/types";

export type CalculateDayFromShiftsParams = {
  dayPayMapBuilder: DayPayMapBuilder;
  meta: WorkDayMeta;
  month: number;
  shifts: Shift[];
  shiftMapBuilder: ShiftMapBuilder;
  standardHours: number;
  status?: WorkDayStatus;
  year: number;
};

export type DayFromShiftsCalculation = {
  dayPayMap: WorkDayMap;
  shiftPayMaps: ShiftPayMap[];
};

export type ComposedDayCalculationParams = Omit<
  CalculateDayFromShiftsParams,
  "dayPayMapBuilder" | "shiftMapBuilder"
>;

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
