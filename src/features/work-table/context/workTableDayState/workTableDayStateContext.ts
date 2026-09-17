import { createContext, Dispatch, SetStateAction, useCallback, useContext } from "react";

import { WorkDayStatus } from "@/constants";
import type { DateService, Shift, ShiftPayMap } from "@/domain";

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

type WorkTableDayStateContextApi = WorkTableDayStateContextValue & {
  getAdjacentDayShifts: (dateKey: string, dateService: DateService) => Shift[];
};

export const emptyDayState: DayEditingState = {
  status: WorkDayStatus.normal,
  shiftEntries: {},
};

export const WorkTableDayStateContext =
  createContext<WorkTableDayStateContextValue | null>(null);

export const useWorkTableDayStateContext = (): WorkTableDayStateContextApi => {
  const context = useContext(WorkTableDayStateContext);

  if (!context) {
    throw new Error(
      "useWorkTableDayStateContext must be used within WorkTableDayStateProvider",
    );
  }

  const getAdjacentDayShifts = useCallback(
    (dateKey: string, dateService: DateService): Shift[] => {
      const dayDate = dateService.createDateWithTime(dateKey);
      const previousDateKey = dateService.formatDate(
        dateService.addDaysToDate(dayDate, -1),
      );
      const nextDateKey = dateService.formatDate(
        dateService.addDaysToDate(dayDate, 1),
      );

      return [
        ...Object.values(context.state[previousDateKey]?.shiftEntries ?? {}),
        ...Object.values(context.state[nextDateKey]?.shiftEntries ?? {}),
      ].map((entry) => entry.shift);
    },
    [context.state],
  );

  return { ...context, getAdjacentDayShifts };
};

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
