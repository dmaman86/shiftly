import { useCallback, useMemo, useState } from "react";

import { TimeFieldType } from "@/models";

type Segment = {
  start: TimeFieldType;
  end: TimeFieldType;
};

export const useSegments = (day: string) => {
  const [segments, setSegments] = useState<Segment[]>([]);
  const baseDate = useMemo(() => new Date(`${day}T00:00:00`), [day]);

  const addSegment = useCallback(() => {
    const newSegment: Segment = {
      start: { date: baseDate, minutes: 0 },
      end: { date: baseDate, minutes: 0 },
    };
    setSegments((prev) => [...prev, newSegment]);
  }, [baseDate]);

  const updateSegment = useCallback(
    (index: number, newSegment: Segment): Segment[] => {
      const updated = [...segments];

      updated[index] = newSegment;
      return updated;
    },
    [segments],
  );

  const removeSegment = useCallback(
    (index: number): Segment[] => {
      const updated = segments.filter((_, i) => i !== index);
      return updated;
    },
    [segments],
  );

  return {
    segments,
    setSegments,
    addSegment,
    updateSegment,
    removeSegment,
  };
};
