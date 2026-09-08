import { useCallback, useState } from "react";

import { Shift, ShiftPayMap, WorkDayMeta } from "@/domain";
import { DomainContextType } from "@/app";
import { useShiftControls } from "./useShiftControls";

type UseShiftEditorProps = {
  domain: DomainContextType;
  shift: Shift;
  meta: WorkDayMeta;
  standardHours: number;
  onShiftUpdate: (shift: Shift, payMap: ShiftPayMap) => void;
};

/**
 * Editing behavior shared by every presentation of a shift (desktop row,
 * mobile card): draft state, validation, and immediate calculation updates.
 * Invalid drafts remain local and never replace the last valid shift.
 */
export const useShiftEditor = ({
  domain,
  shift,
  meta,
  standardHours,
  onShiftUpdate,
}: UseShiftEditorProps) => {
  const [draft, setDraft] = useState<Shift | null>(null);
  const localShift = draft?.id === shift.id ? draft : shift;

  const updateShift = useCallback(
    (nextShift: Shift) => {
      if (!domain.services.shiftService.isValidShiftDuration(nextShift)) {
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
    [domain, meta, standardHours, onShiftUpdate],
  );

  const controls = useShiftControls({
    ...domain.services,
    onChange: updateShift,
    shift: localShift,
  });

  return {
    localShift,
    ...controls,
  };
};
