import { useEffect, useRef } from "react";

import { WorkDayMap } from "@/domain";
import { isSameDayPayMap } from "../helpers";

type UseSyncDayToGlobalStateProps = {
  dateKey: string;
  dayPayMap: WorkDayMap;
  updateDayPayMap: (dateKey: string, dayPayMap: WorkDayMap) => void;
  removeDay: (dateKey: string) => void;
};

/**
 * Keeps the global daily pay map in sync with a day's local pay map,
 * without re-dispatching when nothing actually changed.
 */
export const useSyncDayToGlobalState = ({
  dateKey,
  dayPayMap,
  updateDayPayMap,
  removeDay,
}: UseSyncDayToGlobalStateProps) => {
  const prevDayPayMapRef = useRef<WorkDayMap | null>(null);

  useEffect(() => {
    const prev = prevDayPayMapRef.current;

    if (dayPayMap.totalHours === 0) {
      if (prev) {
        removeDay(dateKey);
        prevDayPayMapRef.current = null;
      }
      return;
    }

    if (!prev || !isSameDayPayMap(prev, dayPayMap)) {
      updateDayPayMap(dateKey, dayPayMap);
      prevDayPayMapRef.current = dayPayMap;
    }
  }, [dayPayMap, dateKey, updateDayPayMap, removeDay]);
};
