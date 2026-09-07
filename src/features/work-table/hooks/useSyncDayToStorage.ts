import { useContext, useEffect, useRef } from "react";

import { WorkDayStatus } from "@/constants";
import type { Shift } from "@/domain";
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

type PendingShiftUpsert = {
  dateKey: string;
  shift: Shift;
  userId: string;
};

const SHIFT_UPSERT_DEBOUNCE_MS = 600;

/**
 * Persists a single day's status and valid shifts. Shift upserts are debounced
 * so editing a time field does not issue a request for every intermediate value.
 * Invalid drafts have no pay map and never reach Supabase. A no-op in guest mode.
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
  const previousValidEntriesRef = useRef<Record<string, ShiftEntry>>({});
  const pendingUpsertsRef = useRef<Record<string, PendingShiftUpsert>>({});
  const upsertTimeoutsRef = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});

  useEffect(
    () => () => {
      Object.values(upsertTimeoutsRef.current).forEach(clearTimeout);

      // Flush valid edits without using callEndPoint: its loading state is
      // already unmounted at this point.
      Object.values(pendingUpsertsRef.current).forEach(
        ({ userId, dateKey: pendingDateKey, shift }) => {
          void shiftService().upsert(userId, pendingDateKey, shift).call();
        },
      );
    },
    [],
  );

  useEffect(() => {
    if (!user || !hydrated) {
      Object.values(upsertTimeoutsRef.current).forEach(clearTimeout);
      upsertTimeoutsRef.current = {};
      pendingUpsertsRef.current = {};
      return;
    }
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

    const validEntries = Object.values(shiftEntries).filter(
      (entry) => entry.payMap !== null,
    );
    const validEntriesById = Object.fromEntries(
      validEntries.map((entry) => [entry.shift.id, entry]),
    );
    const previousValidEntries = previousValidEntriesRef.current;
    previousValidEntriesRef.current = validEntriesById;

    const removedIds = Object.keys(previousValidEntries).filter(
      (id) => !(id in validEntriesById),
    );
    const changedEntries = validEntries.filter(
      (entry) =>
        previousValidEntries[entry.shift.id]?.shift !== entry.shift,
    );

    removedIds.forEach((id) => {
      clearTimeout(upsertTimeoutsRef.current[id]);
      delete upsertTimeoutsRef.current[id];
      delete pendingUpsertsRef.current[id];

      void callEndPoint(shiftService().remove(user.id, id)).then((result) => {
        if (result.error) snackbar.error(result.error);
      });
    });

    changedEntries.forEach((entry) => {
      const shiftId = entry.shift.id;
      clearTimeout(upsertTimeoutsRef.current[shiftId]);
      pendingUpsertsRef.current[shiftId] = {
        userId: user.id,
        dateKey,
        shift: entry.shift,
      };
      upsertTimeoutsRef.current[shiftId] = setTimeout(() => {
        const pendingUpsert = pendingUpsertsRef.current[shiftId];
        if (!pendingUpsert) return;

        delete pendingUpsertsRef.current[shiftId];
        delete upsertTimeoutsRef.current[shiftId];

        void callEndPoint(
          shiftService().upsert(
            pendingUpsert.userId,
            pendingUpsert.dateKey,
            pendingUpsert.shift,
          ),
        ).then((result) => {
          if (result.error) snackbar.error(result.error);
        });
      }, SHIFT_UPSERT_DEBOUNCE_MS);
    });
    // snackbar isn't referentially stable (see comment above) - read via closure.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, hydrated, dateKey, shiftEntries, callEndPoint]);
};
