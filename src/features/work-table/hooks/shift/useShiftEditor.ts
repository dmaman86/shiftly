import { useCallback, useState } from "react";

import { Shift, ShiftPayMap, WorkDayMeta } from "@/domain";
import { DomainContextType } from "@/app";
import { useShiftControls } from "./useShiftControls";

type UseShiftEditorProps = {
  domain: DomainContextType;
  shift: Shift;
  meta: WorkDayMeta;
  standardHours: number;
  otherShifts: Shift[];
  onShiftUpdate: (shift: Shift, payMap: ShiftPayMap) => void;
};

/**
 * Editing behavior shared by every presentation of a shift (desktop row,
 * mobile card): draft state, validation, and immediate calculation updates.
 * Invalid drafts remain local and never replace the last valid shift.
 *
 * `otherShifts` is the day's other shifts (the caller excludes the one being
 * edited). A draft that overlaps any of them is treated like an invalid
 * duration - kept local and never committed - so a day can't end up with two
 * shifts covering the same time, duplicates included.
 */
export const useShiftEditor = ({
  domain,
  shift,
  meta,
  standardHours,
  otherShifts,
  onShiftUpdate,
}: UseShiftEditorProps) => {
  const [draft, setDraft] = useState<Shift | null>(null);
  const localShift = draft?.id === shift.id ? draft : shift;

  const hasOverlap = otherShifts.some((other) =>
    domain.services.shiftService.overlaps(localShift, other),
  );

  const updateShift = useCallback(
    (nextShift: Shift) => {
      const isValidDuration = domain.services.shiftService.isValidShiftDuration(nextShift);
      const overlapsSibling = otherShifts.some((other) =>
        domain.services.shiftService.overlaps(nextShift, other),
      );
      if (!isValidDuration || overlapsSibling) {
        setDraft(nextShift);
        return;
      }
      setDraft(null);

      const payMap = domain.payMap.shiftMapBuilder.build({
        shift: nextShift,
        meta,
        standardHours,
        isFieldDutyShift: nextShift.isDuty,
      });
      onShiftUpdate(nextShift, payMap);
    },
    [domain, meta, standardHours, otherShifts, onShiftUpdate],
  );

  const controls = useShiftControls({
    ...domain.services,
    onChange: updateShift,
    shift: localShift,
  });

  return {
    localShift,
    hasOverlap,
    ...controls,
  };
};
