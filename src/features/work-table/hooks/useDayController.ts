import { useCallback } from "react";

import { useGlobalState, useWorkDays } from "@/hooks";
import { TimeFieldType, WorkDayInfo } from "@/domain";
import { WorkDayStatus } from "@/constants";
import { DomainContextType } from "@/app";
import { dayToPayBreakdownVM } from "@/adapters";
import { analyticsService } from "@/services/analytics";
import { useDay } from "./useDay";
import { useSyncDayToGlobalState } from "./useSyncDayToGlobalState";
import { dayToCompactPayBreakdownVM } from "../mappers/dayToCompactPayBreakdownVM";

type UseDayControllerProps = {
  domain: DomainContextType;
  workDay: WorkDayInfo;
  shabbatCreditHours: number;
};

/**
 * Orchestration shared by every presentation of a work day (desktop table
 * row, mobile card): owns the day's editing state, keeps it synced to the
 * global daily pay map, and derives the view models both layouts render.
 */
export const useDayController = ({
  domain,
  workDay,
  shabbatCreditHours,
}: UseDayControllerProps) => {
  const { dateService } = domain.services;
  const { baseRate, standardHours, year, month, addDay, removeDay } =
    useGlobalState();
  const { isSpecialFullDay } = useWorkDays();

  const {
    status,
    setStatus,
    dayPayMap,
    shiftEntries,
    setShiftEntries,
    addShift,
    updateShift,
    removeShift,
  } = useDay({ domain, meta: workDay.meta, standardHours, year, month });

  useSyncDayToGlobalState({
    dateKey: workDay.meta.date,
    dayPayMap,
    addDay,
    removeDay,
  });

  const specialFullDay = isSpecialFullDay(workDay.meta.date);
  const isEditable = status === WorkDayStatus.normal;

  const handleStatusChanged = useCallback(
    (newStatus: WorkDayStatus) => {
      setStatus(newStatus);
      setShiftEntries({});
    },
    [setStatus, setShiftEntries],
  );

  const handleAddShift = useCallback(() => {
    const id = crypto.randomUUID();
    const time = dateService.createDateWithTime(workDay.meta.date);
    const start: TimeFieldType = { date: time };
    const end: TimeFieldType = { date: time };
    addShift({ id, start, end, isDuty: false });
    analyticsService.track({ name: "shift_added", params: { month, year } });
  }, [workDay.meta.date, addShift, dateService, month, year]);

  const shifts = Object.values(shiftEntries);

  const expandedBreakdown = dayToPayBreakdownVM(dayPayMap, shabbatCreditHours);
  const compactBreakdown = dayToCompactPayBreakdownVM(
    dayPayMap,
    baseRate,
    shabbatCreditHours,
  );

  return {
    status,
    isEditable,
    specialFullDay,
    shifts,
    updateShift,
    removeShift,
    handleStatusChanged,
    handleAddShift,
    expandedBreakdown,
    compactBreakdown,
    standardHours,
    baseRate,
  };
};
