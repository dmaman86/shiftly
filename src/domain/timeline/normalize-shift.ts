import type { Shift } from "../types/data-shapes";
import type { NormalizedShiftTimeline } from "../types/types";
import type { ShiftService } from "../services/shift.service";

/**
 * Converts a valid shift into one continuous minute range. It deliberately
 * does not split at midnight or infer any salary classification.
 */
export const normalizeShiftTimeline = (params: {
  shift: Shift;
  shiftService: ShiftService;
}): NormalizedShiftTimeline | null => {
  const { shift, shiftService } = params;

  if (!shiftService.isValidShiftDuration(shift)) return null;

  return {
    sourceShiftId: shift.id,
    point: {
      start: shiftService.getMinutesFromMidnight(shift.start.date),
      end: shiftService.getMinutesFromMidnight(
        shift.end.date,
        shift.start.date,
      ),
    },
  };
};
