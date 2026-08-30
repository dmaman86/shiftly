import { useContext, useEffect, useRef } from "react";

import { WorkDayStatus } from "@/constants";
import { useAppSnackbar } from "@/hooks/useAppSnackbar";
import { useAuth } from "@/hooks/useAuth";
import { useFetch } from "@/hooks/useFetch";
import { shiftService, workDayService } from "@/services";
import { ShiftEntries, ShiftEntry, WorkTableDayStateContext } from "./workTableDayStateContext";

type UseSyncDayToStorageProps = {
  dateKey: string;
  status: WorkDayStatus;
  shiftEntries: ShiftEntries;
};

/**
 * Write-through persistence for a single day's status and saved shifts.
 * A shift only counts as "saved" once it has a payMap (see useShiftEditor's
 * handleSave) - draft edits never reach Supabase. A no-op in guest mode.
 *
 * Gated on the provider's `hydrated` flag: before hydration resolves, status
 * and shiftEntries are just the empty/default placeholder, not a real user
 * change. Writing that placeholder (status "normal" upserts as a delete)
 * would race against hydration's own correction and can wipe a persisted
 * sick/vacation day if the delete lands after the hydrated re-sync.
 */
export const useSyncDayToStorage = ({
  dateKey,
  status,
  shiftEntries,
}: UseSyncDayToStorageProps) => {
  const context = useContext(WorkTableDayStateContext);

  if (!context) {
    throw new Error("useSyncDayToStorage must be used within WorkTableDayStateProvider");
  }

  const { hydrated } = context;
  const { user } = useAuth();
  const { callEndPoint } = useFetch();
  const snackbar = useAppSnackbar();

  const prevStatusRef = useRef<WorkDayStatus | null>(null);
  const prevSavedIdsRef = useRef<Record<string, ShiftEntry>>({});

  useEffect(() => {
    if (!user || !hydrated) return;
    if (prevStatusRef.current === status) return;
    prevStatusRef.current = status;

    void callEndPoint(workDayService().setStatus(user.id, dateKey, status)).then((result) => {
      if (result.error) snackbar.error(result.error);
    });
    // snackbar isn't referentially stable (AppSnackbarProvider doesn't memoize
    // its context value), so it's read via the closure instead of listed here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, hydrated, dateKey, status, callEndPoint]);

  useEffect(() => {
    if (!user || !hydrated) return;

    const savedEntries = Object.values(shiftEntries).filter((entry) => entry.payMap !== null);
    const savedIds = Object.fromEntries(savedEntries.map((entry) => [entry.shift.id, entry]));
    const prevSavedIds = prevSavedIdsRef.current;
    prevSavedIdsRef.current = savedIds;

    const removedIds = Object.keys(prevSavedIds).filter((id) => !(id in savedIds));
    const changedEntries = savedEntries.filter(
      (entry) => prevSavedIds[entry.shift.id]?.shift !== entry.shift,
    );

    removedIds.forEach((id) => {
      void callEndPoint(shiftService().remove(user.id, id)).then((result) => {
        if (result.error) snackbar.error(result.error);
      });
    });

    changedEntries.forEach((entry) => {
      void callEndPoint(shiftService().upsert(user.id, dateKey, entry.shift)).then((result) => {
        if (result.error) snackbar.error(result.error);
      });
    });
    // snackbar isn't referentially stable (see comment above) - read via closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, hydrated, dateKey, shiftEntries, callEndPoint]);
};
