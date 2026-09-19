import { useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";

import type { DomainContextType } from "@/app";
import type { WorkDayInfo, WorkDayMap } from "@/domain";
import { useAppSnackbar, useAuth, useGlobalState } from "@/hooks";
import { shiftService, workDayService } from "@/services";
import type { ShiftRecord } from "@/services/shift/shift.service";
import type { WorkDayRecord } from "@/services/workDay/workDay.service";
import { useGlobalStore } from "@/store/globalStore";
import { resolveErrorMessage } from "@/utils";
import { useWorkTableDayStateContext } from "../../context/workTableDayState/workTableDayStateContext";
import {
  type DayMutation,
  getWorkTableStateChanges,
} from "../../helpers/workTableStateChanges";
import { recordsToWorkTableDayState } from "../../mappers/month/recordsToWorkTableDayState";
import { workTableStateToDailyPayMaps } from "../../mappers/month/workTableStateToDailyPayMaps";
import { useDebouncedShiftUpserts } from "./useDebouncedShiftUpserts";

type WorkTableMonthSessionProps = {
  domain: DomainContextType;
  workDays: WorkDayInfo[];
};

type PersistedWorkTableRecords = {
  days: WorkDayRecord[];
  shifts: ShiftRecord[];
};

const EMPTY_DAILY_PAY_MAPS: Record<string, WorkDayMap> = {};

const persistDayChange = async (change: DayMutation) => {
  const endpoint =
    change.type === "upsertShift"
      ? shiftService().upsert(change.userId, change.dateKey, change.shift)
      : change.type === "removeShift"
        ? shiftService().remove(change.userId, change.shiftId)
        : workDayService().setStatus(change.userId, change.dateKey, change.status);

  const result = await endpoint.call();
  if (result.error) throw new Error(result.error);
};

/** Owns the server snapshot, editable month state, projection, and writes. */
export const useWorkTableMonthSession = ({
  domain,
  workDays,
}: WorkTableMonthSessionProps) => {
  const { state, dispatch, hydrated, setHydrated } = useWorkTableDayStateContext();
  const { user, isLoading: isAuthLoading } = useAuth();
  const snackbar = useAppSnackbar();
  const { year, month, standardHours } = useGlobalState();
  const replaceDailyPayMaps = useGlobalStore((store) => store.replaceDailyPayMaps);
  const userId = user?.id;
  const previousStateRef = useRef<typeof state | null>(null);

  const dailyPayMaps = useMemo(() => {
    if (workDays.length === 0 && Object.keys(state).length === 0) {
      return EMPTY_DAILY_PAY_MAPS;
    }

    return workTableStateToDailyPayMaps({
      domain,
      state,
      workDays,
      standardHours,
      year,
      month,
    });
  }, [domain, month, standardHours, state, workDays, year]);

  const query = useQuery({
    queryKey: ["workTable", userId, year, month],
    enabled: workDays.length > 0 && !!userId && !isAuthLoading && !hydrated,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
    queryFn: async (): Promise<PersistedWorkTableRecords> => {
      if (!userId) throw new Error("An authenticated user is required");
      const { startDate, endDate } = domain.services.dateService.getDatesRange(year, month);
      const [daysResult, shiftsResult] = await Promise.all([
        workDayService().fetchForMonth(userId, startDate, endDate).call(),
        shiftService().fetchForMonth(userId, startDate, endDate).call(),
      ]);
      if (daysResult.error) throw new Error(daysResult.error);
      if (shiftsResult.error) throw new Error(shiftsResult.error);
      return { days: daysResult.data ?? [], shifts: shiftsResult.data ?? [] };
    },
  });

  useEffect(() => {
    if (!userId || hydrated || !query.isSuccess || query.isFetching || !query.data) return;
    dispatch({
      type: "hydrate",
      state: recordsToWorkTableDayState({
        ...query.data,
        workDays,
        shiftMapBuilder: domain.payMap.shiftMapBuilder,
        standardHours,
      }),
    });
    setHydrated(true);
  }, [
    dispatch,
    domain,
    hydrated,
    query.data,
    query.isFetching,
    query.isSuccess,
    setHydrated,
    standardHours,
    userId,
    workDays,
  ]);

  useEffect(() => {
    if (isAuthLoading || (userId && (!hydrated || !query.isSuccess || query.isFetching))) {
      return;
    }

    replaceDailyPayMaps(dailyPayMaps);
  }, [
    dailyPayMaps,
    hydrated,
    isAuthLoading,
    query.data,
    query.isFetching,
    query.isSuccess,
    replaceDailyPayMaps,
    userId,
  ]);

  const { mutate } = useMutation({
    mutationFn: persistDayChange,
    scope: { id: JSON.stringify(["workTable", userId]) },
    retry: false,
    onError: (error) => snackbar.error(resolveErrorMessage(error)),
  });
  const { reset, schedule } = useDebouncedShiftUpserts({ mutate });

  useEffect(() => {
    if (!user || !hydrated) {
      previousStateRef.current = null;
      reset();
      return;
    }

    const previousState = previousStateRef.current;
    previousStateRef.current = state;
    if (previousState === null) return;

    const changes = getWorkTableStateChanges(previousState, state, user.id);
    changes.statusChanges.forEach((change) => mutate(change));
    schedule(changes.removedShiftIds, changes.upsertShifts);
  }, [hydrated, mutate, reset, schedule, state, user]);

  return {
    ready: !isAuthLoading && (!userId || hydrated),
    error: query.error,
    retry: query.refetch,
    isFetching: query.isFetching,
  };
};
