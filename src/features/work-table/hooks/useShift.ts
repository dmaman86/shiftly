import { useCallback, useMemo, useState } from "react";

import { Shift, ShiftPayMap, TimeFieldType, WorkDayMeta } from "@/domain";
import { DomainContextType } from "@/app";

type ShiftProps = {
  domain: DomainContextType;
  shift: Shift;
  meta: WorkDayMeta;
  standardHours: number;
};

type ShiftEntry = {
  shift: Shift;
  payMap: ShiftPayMap | null;
};

export const useShift = ({
  domain,
  shift,
  meta,
  standardHours,
}: ShiftProps) => {
  const { shiftMapBuilder } = domain.payMap;

  const [localShift, setLocalShift] = useState<Shift>(shift);
  const [saved, setSaved] = useState<boolean>(false);

  const update = useCallback(
    (newStart: TimeFieldType, newEnd: TimeFieldType) => {
      setLocalShift((prev) => ({
        ...prev,
        start: newStart,
        end: newEnd,
      }));
    },
    [],
  );

  const toggleDuty = useCallback(() => {
    setLocalShift((prev) => ({
      ...prev,
      isDuty: !prev.isDuty,
    }));
  }, []);

  const shiftEntry: ShiftEntry = useMemo(() => {
    if (saved) {
      const shiftPayMap = shiftMapBuilder.build({
        shift: localShift,
        meta,
        standardHours,
        isFieldDutyShift: localShift.isDuty,
      });
      return { shift: localShift, payMap: shiftPayMap };
    }
    return { shift: localShift, payMap: null };
  }, [shiftMapBuilder, localShift, meta, standardHours, saved]);

  return {
    localShift,
    update,
    toggleDuty,
    saved,
    setSaved,
    shiftEntry,
  };
};
