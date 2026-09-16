import { useContext } from "react";

import type { DomainContextType } from "@/app";
import type { Shift } from "@/domain";
import { WorkTableDayStateContext } from "../context/workTableDayState/workTableDayStateContext";

type UseAdjacentDayShiftsProps = {
  domain: DomainContextType;
  dateKey: string;
};

/**
 * Shifts already recorded on the days immediately before and after `dateKey`.
 * A shift that crosses midnight only exists in the entries of the day it was
 * created for, so overlap checks for cross-day shifts need visibility into
 * the neighboring days, not just the current one.
 */
export const useAdjacentDayShifts = ({
  domain,
  dateKey,
}: UseAdjacentDayShiftsProps): Shift[] => {
  const context = useContext(WorkTableDayStateContext);

  if (!context) {
    throw new Error("useAdjacentDayShifts must be used within WorkTableDayStateProvider");
  }

  const { dateService } = domain.services;
  const dayDate = dateService.createDateWithTime(dateKey);
  const previousDateKey = dateService.formatDate(dateService.addDaysToDate(dayDate, -1));
  const nextDateKey = dateService.formatDate(dateService.addDaysToDate(dayDate, 1));

  return [
    ...Object.values(context.state[previousDateKey]?.shiftEntries ?? {}),
    ...Object.values(context.state[nextDateKey]?.shiftEntries ?? {}),
  ].map((entry) => entry.shift);
};
