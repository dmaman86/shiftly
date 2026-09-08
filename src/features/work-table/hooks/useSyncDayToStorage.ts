import { useContext, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";

import { WorkDayStatus } from "@/constants";
import type { Shift } from "@/domain";
import { useAppSnackbar } from "@/hooks/useAppSnackbar";
import { useAuth } from "@/hooks/useAuth";
import { shiftService, workDayService } from "@/services";
import { resolveErrorMessage } from "@/utils";
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

type DayMutation =
  | ({ type: "upsertShift" } & PendingShiftUpsert)
  | { type: "removeShift"; userId: string; shiftId: string }
  | { type: "setStatus"; userId: string; dateKey: string; status: WorkDayStatus };

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
  const snackbar = useAppSnackbar();
  const { mutate } = useMutation({
    mutationFn: persistDayChange,
    // Keep writes ordered so a late upsert cannot undo a subsequent deletion.
    scope: { id: JSON.stringify(["workDay", user?.id, dateKey]) },
    retry: false,
    onError: (error) => snackbar.error(resolveErrorMessage(error)),
  });

  const prevStatusRef = useRef<WorkDayStatus | null>(null);
  const previousValidEntriesRef = useRef<Record<string, ShiftEntry>>({});
  const pendingUpsertsRef = useRef<Record<string, PendingShiftUpsert>>({});
  const upsertTimeoutsRef = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});

  useEffect(
    () => () => {
      Object.values(upsertTimeoutsRef.current).forEach(clearTimeout);

      Object.values(pendingUpsertsRef.current).forEach((pendingUpsert) => {
        mutate({ type: "upsertShift", ...pendingUpsert });
      });
      pendingUpsertsRef.current = {};
      upsertTimeoutsRef.current = {};
    },
    [mutate],
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

    mutate({ type: "setStatus", userId: user.id, dateKey, status });
  }, [user, hydrated, dateKey, status, mutate]);

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

      mutate({ type: "removeShift", userId: user.id, shiftId: id });
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

        mutate({ type: "upsertShift", ...pendingUpsert });
      }, SHIFT_UPSERT_DEBOUNCE_MS);
    });
  }, [user, hydrated, dateKey, shiftEntries, mutate]);
};
