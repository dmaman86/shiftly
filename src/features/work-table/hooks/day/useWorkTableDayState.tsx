import { Dispatch, SetStateAction, useCallback } from "react";

import { WorkDayStatus } from "@/constants";
import {
  emptyDayState,
  ShiftEntries,
  useWorkTableDayStateContext,
} from "../../context/workTableDayState/workTableDayStateContext";

export const useWorkTableDayState = (dateKey: string) => {
  const { state, dispatch } = useWorkTableDayStateContext();
  const dayState = state[dateKey] ?? emptyDayState;

  const setStatus: Dispatch<SetStateAction<WorkDayStatus>> = useCallback(
    (value) => dispatch({ type: "setStatus", dateKey, value }),
    [dispatch, dateKey],
  );

  const setShiftEntries: Dispatch<SetStateAction<ShiftEntries>> = useCallback(
    (value) => dispatch({ type: "setShiftEntries", dateKey, value }),
    [dispatch, dateKey],
  );

  return {
    ...dayState,
    setStatus,
    setShiftEntries,
  };
};
