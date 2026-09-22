import { useCallback, useMemo } from "react";

import {
  Shift,
  ShiftPayMap,
  WorkDayMeta,
} from "@/domain";
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
  const { status, setStatus, shiftEntries, setShiftEntries } =
    useWorkTableDayState(meta.date);
  const { calculateDayFromShifts } = domain.payMap;

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
    const validShifts = Object.values(shiftEntries)
      .filter((entry) => entry.payMap !== null)
      .map((entry) => entry.shift);

    return calculateDayFromShifts({
      meta,
      month,
      shifts: validShifts,
      standardHours,
      status,
      year,
    }).dayPayMap;
  }, [
    shiftEntries,
    status,
    meta,
    standardHours,
    year,
    month,
    calculateDayFromShifts,
  ]);

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
