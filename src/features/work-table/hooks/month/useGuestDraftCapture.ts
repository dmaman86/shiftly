import { useEffect } from "react";

import { guestDraftStorage } from "@/services";
import type { WorkTableDayState } from "../../context/workTableDayState/workTableDayStateContext";
import { workTableStateToRecords } from "../../mappers/month/workTableStateToRecords";

type GuestDraftCaptureParams = {
  enabled: boolean;
  state: WorkTableDayState;
  year: number;
  month: number;
  standardHours: number;
  baseRate: number;
};

/**
 * Mirrors the guest's month into the draft on every change, so it is already
 * current when they click sign-in. Written synchronously (no debounce): the
 * payload is tiny and a pending debounce would be lost on the OAuth redirect.
 */
export const useGuestDraftCapture = ({
  enabled,
  state,
  year,
  month,
  standardHours,
  baseRate,
}: GuestDraftCaptureParams) => {
  useEffect(() => {
    if (!enabled) return;

    guestDraftStorage.save({
      version: 1,
      savedAt: new Date().toISOString(),
      year,
      month,
      config: { standardHours, baseRate },
      ...workTableStateToRecords(state),
    });
  }, [baseRate, enabled, month, standardHours, state, year]);
};
