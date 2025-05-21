import { useCallback, useState } from "react";

import {
  WorkDayPayMap,
  breakdownService,
  Segment,
  calculateBreakdown,
} from "@/domain";
import { WorkDayStatus, WorkDayType } from "@/constants";

type UseBreakdownDayProps = {
  meta: { date: string; typeDay: WorkDayType; crossDayContinuation: boolean };
  standardHours: number;
};

export const useBreakdownDay = ({
  meta,
  standardHours,
}: UseBreakdownDayProps) => {
  const [breakdownDay, setBreakdownDay] = useState<WorkDayPayMap | null>(null);

  const [status, setStatus] = useState<WorkDayStatus>(WorkDayStatus.normal);

  const updateBreakdown = useCallback(
    (updatedSegments: Segment[], newStatus: WorkDayStatus) => {
      if (updatedSegments.length === 0) {
        setBreakdownDay(null);
        return;
      }
      const newBreakdown = calculateBreakdown(
        updatedSegments,
        meta,
        standardHours,
        newStatus,
      );
      setBreakdownDay(newBreakdown);
    },
    [meta, standardHours],
  );

  const updateBreakdownRate = useCallback(
    (rate: number) => {
      if (breakdownDay) {
        const newBreakdown = breakdownService.updateBaseRate(
          rate,
          breakdownDay,
        );
        setBreakdownDay(newBreakdown);
      }
    },
    [breakdownDay],
  );

  return {
    breakdownDay,
    updateBreakdown,
    status,
    setStatus,
    updateBreakdownRate,
  };
};
