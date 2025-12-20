import { useCallback, useMemo, useState } from "react";

import { Shift, ShiftPayMap, TimeFieldType, WorkDayMeta } from "@/domain";
import { DomainContextType } from "@/context";

type ShiftProps = {
  domain: DomainContextType;
  id: string;
  shift: Shift;
  meta: WorkDayMeta;
  standardHours: number;
  isDuty: boolean;
};

type ShiftEntry = {
  shift: Shift;
  payMap: ShiftPayMap | null;
};

export const useShift = ({
  domain,
  id,
  shift,
  meta,
  standardHours,
  isDuty,
}: ShiftProps) => {
  const { shiftMapBuilder } = domain.payMap;

  const [localShift, setLocalShift] = useState<Shift>(shift);
  const [saved, setSaved] = useState<boolean>(false);

  const update = useCallback(
    (newStart: TimeFieldType, newEnd: TimeFieldType) => {
      setLocalShift({ id, start: newStart, end: newEnd });
    },
    [id],
  );

  const shiftEntry: ShiftEntry = useMemo(() => {
    if (saved) {
      const shiftPayMap = shiftMapBuilder.build({
        shift: localShift,
        meta,
        standardHours,
        isFieldDutyShift: isDuty,
      });
      return { shift: localShift, payMap: shiftPayMap };
    }
    return { shift: localShift, payMap: null };
  }, [shiftMapBuilder, localShift, meta, standardHours, isDuty, saved]);

  return {
    localShift,
    update,
    saved,
    setSaved,
    shiftEntry,
  };
};
