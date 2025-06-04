import { useCallback, useEffect, useState } from "react";

import {
  WorkDayPayMap,
  breakdownService,
  Segment,
  breakdownResolveService,
  WorkDayMeta,
} from "@/domain";
import { WorkDayStatus } from "@/constants";

type UseBreakdownDayProps = {
  meta: WorkDayMeta;
  standardHours: number;
  baseRate: number;
  breakdownService: ReturnType<typeof breakdownService>;
  breakdownResolveService: ReturnType<typeof breakdownResolveService>;
};

export const useBreakdownDay = ({
  meta,
  standardHours,
  baseRate,
  breakdownService,
  breakdownResolveService,
}: UseBreakdownDayProps) => {
  const [segments, setSegments] = useState<Segment[]>([]);
  const [breakdownDay, setBreakdownDay] = useState<WorkDayPayMap | null>(null);

  const [status, setStatus] = useState<WorkDayStatus>(WorkDayStatus.normal);

  const rebuildBreakdown = useCallback(() => {
    if (segments.length === 0) {
      setBreakdownDay(null);
      return;
    }
    const newBreakdown = breakdownResolveService.calculateBreakdown(
      segments,
      meta,
      standardHours,
      status,
    );
    const updated = breakdownService.updateBaseRate(baseRate, newBreakdown);
    setBreakdownDay(updated);
  }, [segments, standardHours, status, baseRate]);

  const updateBreakdown = useCallback((updatedSegments: Segment[]) => {
    setSegments(updatedSegments);
  }, []);

  useEffect(() => {
    rebuildBreakdown();
  }, [rebuildBreakdown]);

  return {
    breakdownDay,
    updateBreakdown,
    status,
    setStatus,
  };
};
