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
    }
  | {
      type: "hydrate";
      state: WorkTableDayState;
    };

export type WorkTableDayStateContextValue = {
  state: WorkTableDayState;
  dispatch: Dispatch<WorkTableDayStateAction>;
  // True once hydration has resolved for this month (or immediately stays
  // false forever in guest mode, where nothing writes anyway). Consumers that
  // persist to Supabase must wait for this - otherwise the pre-hydration
  // default state looks like a real user change and gets written, racing
  // against the hydrated value's own sync.
  hydrated: boolean;
  setHydrated: Dispatch<SetStateAction<boolean>>;
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
  if (action.type === "hydrate") return action.state;

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
