import { useCallback, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { DateUtils } from "@/utils";
import { TimeFieldType, Segment } from "@/domain";
import { WorkDayStatus } from "@/constants";

interface UseSegmentsProps {
  day: string;
  onChange?: (segments: Segment[], status: WorkDayStatus) => void;
  initialSegments?: Segment[];
}

type Shift = { start: number; end: number };

export const useSegments = ({
  day,
  onChange,
  initialSegments = [],
}: UseSegmentsProps) => {
  const [segments, setSegments] = useState<Segment[]>(initialSegments);

  const notifyChange = useCallback(
    (updated: Segment[], status: WorkDayStatus) => {
      setSegments(updated);
      if (onChange) onChange(updated, status);
    },
    [onChange],
  );

  const sortSegments = useCallback((segments: Segment[]) => {
    return [...segments].sort((a, b) => a.start.minutes - b.start.minutes);
  }, []);

  const addSegment = useCallback(
    (status: WorkDayStatus, shift?: Shift) => {
      const start = shift?.start ?? 0;
      const end = shift?.end ?? 0;
      const startDate = DateUtils.createDateWithTime(day, start / 60);
      const endDate = DateUtils.createDateWithTime(
        day,
        Math.floor(end / 60),
        end % 60,
      );

      const newSegment: Segment = {
        id: uuidv4(),
        start: { date: startDate, minutes: start },
        end: { date: endDate, minutes: end },
      };

      const updated =
        status === WorkDayStatus.normal
          ? [...segments, newSegment]
          : [newSegment];
      if (status === WorkDayStatus.normal) setSegments(updated);
      else notifyChange(updated, status);
    },
    [day, segments, notifyChange],
  );

  const updateSegment = useCallback(
    (
      id: string,
      start: TimeFieldType,
      end: TimeFieldType,
      status: WorkDayStatus,
    ) => {
      const updated = segments.map((segment) =>
        segment.id === id ? { ...segment, start, end } : segment,
      );

      notifyChange(sortSegments(updated), status);
    },
    [segments, notifyChange, sortSegments],
  );

  const removeSegment = useCallback(
    (id: string, status: WorkDayStatus) => {
      const updated = segments.filter((segment) => segment.id !== id);
      notifyChange(updated, status);
    },
    [segments, notifyChange],
  );

  const clearSegments = useCallback(
    (status: WorkDayStatus) => {
      notifyChange(initialSegments, status);
    },
    [notifyChange, initialSegments],
  );

  return {
    segments,
    addSegment,
    updateSegment,
    removeSegment,
    clearSegments,
  };
};
