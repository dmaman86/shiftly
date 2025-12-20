import { useCallback, useMemo, useState } from "react";

import { WorkDayStatus } from "@/constants";
import { Shift, ShiftPayMap, WorkDayMeta } from "@/domain";
import { DomainContextType } from "@/context/DomainProvider";

type UseDayProps = {
  domain: DomainContextType;
  meta: WorkDayMeta;
  standardHours: number;
  year: number;
  month: number;
};

type ShiftEntry = {
  shift: Shift;
  payMap: ShiftPayMap | null;
};

type ShiftEntries = Record<string, ShiftEntry>;

export const useDay = ({
  domain,
  meta,
  standardHours,
  year,
  month,
}: UseDayProps) => {
  const daymapBuilder = domain.payMap.dayPayMapBuilder;

  const [shiftEntries, setShiftEntries] = useState<ShiftEntries>({});

  const [status, setStatus] = useState<WorkDayStatus>(WorkDayStatus.normal);

  const addShift = useCallback(
    (shift: Shift) => {
      setShiftEntries((prev) => ({
        ...prev,
        [shift.id]: { shift, payMap: null },
      }));
    },
    [setShiftEntries],
  );

  const updateShift = useCallback(
    (shift: Shift, payMap: ShiftPayMap) => {
      setShiftEntries((prev) => ({
        ...prev,
        [shift.id]: { shift, payMap },
      }));
    },
    [setShiftEntries],
  );

  const removeShift = useCallback(
    (id: string) => {
      setShiftEntries((prev) => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });
    },
    [setShiftEntries],
  );

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
