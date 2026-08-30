import { useContext, useEffect, useRef } from "react";

import { DomainContextType } from "@/app";
import { WorkDayStatus } from "@/constants";
import { Shift, WorkDayInfo } from "@/domain";
import { useAppSnackbar } from "@/hooks/useAppSnackbar";
import { useAuth } from "@/hooks/useAuth";
import { useFetch } from "@/hooks/useFetch";
import { useGlobalState } from "@/hooks/useGlobalState";
import { shiftService, workDayService } from "@/services";
import { WorkTableDayState, WorkTableDayStateContext } from "./workTableDayStateContext";

type UseHydrateWorkTableDayStateProps = {
  domain: DomainContextType;
  workDays: WorkDayInfo[];
};

/**
 * Fetches this month's persisted day statuses and shifts for the
 * authenticated user and replaces the provider's state with them. A no-op in
 * guest mode, leaving the provider's empty initial state untouched.
 */
export const useHydrateWorkTableDayState = ({
  domain,
  workDays,
}: UseHydrateWorkTableDayStateProps) => {
  const context = useContext(WorkTableDayStateContext);

  if (!context) {
    throw new Error(
      "useHydrateWorkTableDayState must be used within WorkTableDayStateProvider",
    );
  }

  const { dispatch, setHydrated } = context;
  const { user } = useAuth();
  const { year, month, standardHours } = useGlobalState();
  const { callEndPoint } = useFetch();
  const snackbar = useAppSnackbar();

  // standardHours is only needed to compute a hydrated shift's payMap, not to
  // decide whether to re-fetch - it's read via a ref so a config change
  // (e.g. useMonthlyConfigSync hydrating it moments after mount) can't
  // re-trigger this effect and clobber local edits made in between with a
  // stale full-state "hydrate" dispatch.
  const standardHoursRef = useRef(standardHours);
  useEffect(() => {
    standardHoursRef.current = standardHours;
  });

  useEffect(() => {
    if (!user || workDays.length === 0) return;

    let cancelled = false;
    const { startDate, endDate } = domain.services.dateService.getDatesRange(year, month);

    void Promise.all([
      callEndPoint(workDayService().fetchForMonth(user.id, startDate, endDate)),
      callEndPoint(shiftService().fetchForMonth(user.id, startDate, endDate)),
    ]).then(([daysResult, shiftsResult]) => {
      if (cancelled) return;

      if (daysResult.error) {
        snackbar.error(daysResult.error);
        return;
      }
      if (shiftsResult.error) {
        snackbar.error(shiftsResult.error);
        return;
      }

      const hydratedState: WorkTableDayState = {};

      for (const day of daysResult.data ?? []) {
        hydratedState[day.date] = { status: day.status, shiftEntries: {} };
      }

      for (const row of shiftsResult.data ?? []) {
        const meta = workDays.find((day) => day.meta.date === row.date)?.meta;
        if (!meta) continue;

        const shift: Shift = {
          id: row.id,
          start: { date: new Date(row.start_time) },
          end: { date: new Date(row.end_time) },
          isDuty: row.is_duty,
        };

        const payMap = domain.payMap.shiftMapBuilder.build({
          shift,
          meta,
          standardHours: standardHoursRef.current,
          isFieldDutyShift: shift.isDuty,
        });

        const dayState = hydratedState[row.date] ?? {
          status: WorkDayStatus.normal,
          shiftEntries: {},
        };

        hydratedState[row.date] = {
          ...dayState,
          shiftEntries: { ...dayState.shiftEntries, [shift.id]: { shift, payMap } },
        };
      }

      dispatch({ type: "hydrate", state: hydratedState });
      setHydrated(true);
    });

    return () => {
      cancelled = true;
    };
    // snackbar isn't referentially stable (AppSnackbarProvider doesn't memoize
    // its context value), so it's read via the closure instead of listed here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, year, month, workDays, domain, callEndPoint, dispatch, setHydrated]);
};
