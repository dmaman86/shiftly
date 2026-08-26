import { Dispatch, SetStateAction, useCallback, useContext } from "react";

import { WorkDayStatus } from "@/constants";
import {
  emptyDayState,
  ShiftEntries,
  WorkTableDayStateContext,
} from "./workTableDayStateContext";

export const useWorkTableDayState = (dateKey: string) => {
  const context = useContext(WorkTableDayStateContext);

  if (!context) {
    throw new Error(
      "useWorkTableDayState must be used within WorkTableDayStateProvider",
    );
  }

  const { state, dispatch } = context;
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
