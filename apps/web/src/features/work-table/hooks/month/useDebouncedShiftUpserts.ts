import { useCallback, useEffect, useRef } from "react";

import type {
  DayMutation,
  PendingShiftUpsert,
} from "../../helpers/workTableStateChanges";

const SHIFT_UPSERT_DEBOUNCE_MS = 600;

type UseDebouncedShiftUpsertsProps = {
  mutate: (change: DayMutation) => void;
};

export const useDebouncedShiftUpserts = ({
  mutate,
}: UseDebouncedShiftUpsertsProps) => {
  const pendingUpsertsRef = useRef<Record<string, PendingShiftUpsert>>({});
  const upsertTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const clearPendingUpsert = useCallback((shiftId: string) => {
    clearTimeout(upsertTimeoutsRef.current[shiftId]);
    delete upsertTimeoutsRef.current[shiftId];
    delete pendingUpsertsRef.current[shiftId];
  }, []);

  const reset = useCallback(() => {
    Object.keys(upsertTimeoutsRef.current).forEach(clearPendingUpsert);
  }, [clearPendingUpsert]);

  const schedule = useCallback(
    (
      removedShifts: Array<Extract<DayMutation, { type: "removeShift" }>>,
      upsertShifts: PendingShiftUpsert[],
    ) => {
      removedShifts.forEach(({ userId, shiftId }) => {
        clearPendingUpsert(shiftId);
        mutate({ type: "removeShift", userId, shiftId });
      });

      upsertShifts.forEach((upsert) => {
        const { shift } = upsert;
        clearTimeout(upsertTimeoutsRef.current[shift.id]);
        pendingUpsertsRef.current[shift.id] = upsert;
        upsertTimeoutsRef.current[shift.id] = setTimeout(() => {
          const pendingUpsert = pendingUpsertsRef.current[shift.id];
          if (!pendingUpsert) return;

          clearPendingUpsert(shift.id);
          mutate({ type: "upsertShift", ...pendingUpsert });
        }, SHIFT_UPSERT_DEBOUNCE_MS);
      });
    },
    [clearPendingUpsert, mutate],
  );

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

  return { reset, schedule };
};
