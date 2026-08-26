import { createContext, Dispatch, SetStateAction } from "react";

import { WorkDayStatus } from "@/constants";
import { Shift, ShiftPayMap } from "@/domain";

export type ShiftEntry = {
  shift: Shift;
  payMap: ShiftPayMap | null;
};

export type ShiftEntries = Record<string, ShiftEntry>;

export type DayEditingState = {
  status: WorkDayStatus;
  shiftEntries: ShiftEntries;
};

export type WorkTableDayState = Record<string, DayEditingState>;

export type WorkTableDayStateAction =
  | {
      type: "setStatus";
      dateKey: string;
      value: SetStateAction<WorkDayStatus>;
    }
  | {
      type: "setShiftEntries";
      dateKey: string;
      value: SetStateAction<ShiftEntries>;
    };

export type WorkTableDayStateContextValue = {
  state: WorkTableDayState;
  dispatch: Dispatch<WorkTableDayStateAction>;
};

export const emptyDayState: DayEditingState = {
  status: WorkDayStatus.normal,
  shiftEntries: {},
};

export const WorkTableDayStateContext =
  createContext<WorkTableDayStateContextValue | null>(null);

export const workTableDayStateReducer = (
  state: WorkTableDayState,
  action: WorkTableDayStateAction,
): WorkTableDayState => {
  const currentDayState = state[action.dateKey] ?? emptyDayState;

  if (action.type === "setStatus") {
    const status =
      typeof action.value === "function"
        ? action.value(currentDayState.status)
        : action.value;

    return {
      ...state,
      [action.dateKey]: { ...currentDayState, status },
    };
  }

  const shiftEntries =
    typeof action.value === "function"
      ? action.value(currentDayState.shiftEntries)
      : action.value;

  return {
    ...state,
    [action.dateKey]: { ...currentDayState, shiftEntries },
  };
};
