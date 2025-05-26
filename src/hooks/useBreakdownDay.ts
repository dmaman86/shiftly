import { useCallback, useState } from "react";

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
  breakdownService: ReturnType<typeof breakdownService>;
  breakdownResolveService: ReturnType<typeof breakdownResolveService>;
};

export const useBreakdownDay = ({
  meta,
  standardHours,
  breakdownService,
  breakdownResolveService,
}: UseBreakdownDayProps) => {
  const [breakdownDay, setBreakdownDay] = useState<WorkDayPayMap | null>(null);

  const [status, setStatus] = useState<WorkDayStatus>(WorkDayStatus.normal);

  const updateBreakdown = useCallback(
    (updatedSegments: Segment[], newStatus: WorkDayStatus) => {
      if (updatedSegments.length === 0) {
        setBreakdownDay(null);
        return;
      }
      const newBreakdown = breakdownResolveService.calculateBreakdown(
        updatedSegments,
        meta,
        standardHours,
        newStatus,
      );
      setBreakdownDay(newBreakdown);
    },
    [meta, standardHours, breakdownResolveService],
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
    [breakdownDay, breakdownService],
  );

  return {
    breakdownDay,
    updateBreakdown,
    status,
    setStatus,
    updateBreakdownRate,
  };
};
