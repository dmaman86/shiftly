import { useCallback, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { TimeFieldType } from "@/models";

type Segment = {
  id: string;
  start: TimeFieldType;
  end: TimeFieldType;
};

export const useSegments = (day: string) => {
  const [segments, setSegments] = useState<Segment[]>([]);
  const baseDate = useMemo(() => new Date(`${day}T00:00:00`), [day]);

  const addSegment = useCallback(() => {
    const newSegment: Segment = {
      id: uuidv4(),
      start: { date: baseDate, minutes: 0 },
      end: { date: baseDate, minutes: 0 },
    };
    setSegments((prev) => [...prev, newSegment]);
  }, [baseDate]);

  const updateSegment = useCallback(
    (id: string, start: TimeFieldType, end: TimeFieldType): Segment[] => {
      const updated = segments.map((segment) =>
        segment.id === id ? { ...segment, start, end } : segment,
      );

      return updated;
    },
    [segments],
  );

  const removeSegment = useCallback(
    (id: string): Segment[] => {
      const updated = segments.filter((segment) => segment.id !== id);
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
