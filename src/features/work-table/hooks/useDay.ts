import { useCallback, useMemo } from "react";

import { Shift, ShiftPayMap, WorkDayMeta } from "@/domain";
import { DomainContextType } from "@/app";
import { useWorkTableDayState } from "./useWorkTableDayState";

type UseDayProps = {
  domain: DomainContextType;
  meta: WorkDayMeta;
  standardHours: number;
  year: number;
  month: number;
};

export const useDay = ({
  domain,
  meta,
  standardHours,
  year,
  month,
}: UseDayProps) => {
  const daymapBuilder = domain.payMap.dayPayMapBuilder;
  const { status, setStatus, shiftEntries, setShiftEntries } =
    useWorkTableDayState(meta.date);

  const addShift = useCallback((shift: Shift) => {
    setShiftEntries((prev) => {
      const next = {
        ...prev,
        [shift.id]: { shift, payMap: null },
      };
      return next;
    });
  }, [setShiftEntries]);

  const updateShift = useCallback((shift: Shift, payMap: ShiftPayMap) => {
    setShiftEntries((prev) => {
      const next = {
        ...prev,
        [shift.id]: { shift, payMap },
      };
      return next;
    });
  }, [setShiftEntries]);

  const removeShift = useCallback((id: string) => {
    setShiftEntries((prev) => {
      const copy = { ...prev };
      delete copy[id];

      return copy;
    });
  }, [setShiftEntries]);

  const dayPayMap = useMemo(() => {
    const payMaps = Object.values(shiftEntries)
      .map((entry) => entry.payMap)
      .filter((pm): pm is ShiftPayMap => pm !== null);

    return daymapBuilder.build({
      shifts: payMaps,
      status,
      meta,
      standardHours,
      year,
      month,
    });
  }, [shiftEntries, status, meta, standardHours, year, month, daymapBuilder]);

  return {
    status,
    setStatus,

    dayPayMap,
    shiftEntries,
    setShiftEntries,

    addShift,
    updateShift,
    removeShift,
  };
};
