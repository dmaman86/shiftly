import { WorkDayStatus } from "@/constants";
import type { Shift } from "@/domain";
import type { WorkTableDayState } from "../context/workTableDayState/workTableDayStateContext";

export type PendingShiftUpsert = {
  dateKey: string;
  shift: Shift;
  userId: string;
};

export type DayMutation =
  | ({ type: "upsertShift" } & PendingShiftUpsert)
  | { type: "removeShift"; userId: string; shiftId: string }
  | { type: "setStatus"; userId: string; dateKey: string; status: WorkDayStatus };

export type WorkTableStateChanges = {
  statusChanges: Array<Extract<DayMutation, { type: "setStatus" }>>;
  removedShiftIds: Array<Extract<DayMutation, { type: "removeShift" }>>;
  upsertShifts: Array<Extract<DayMutation, { type: "upsertShift" }>>;
};

const emptyDayState = { status: WorkDayStatus.normal, shiftEntries: {} };

const getDayState = (state: WorkTableDayState, dateKey: string) =>
  state[dateKey] ?? emptyDayState;

const getValidEntries = (state: WorkTableDayState, dateKey: string) =>
  Object.values(getDayState(state, dateKey).shiftEntries).filter(
    (entry) => entry.payMap !== null,
  );

const shiftsAreEqual = (a: Shift, b: Shift) =>
  a.id === b.id &&
  a.start.date.getTime() === b.start.date.getTime() &&
  a.end.date.getTime() === b.end.date.getTime() &&
  a.isDuty === b.isDuty;

export const getWorkTableStateChanges = (
  previousState: WorkTableDayState,
  currentState: WorkTableDayState,
  userId: string,
): WorkTableStateChanges => {
  const changes: WorkTableStateChanges = {
    statusChanges: [],
    removedShiftIds: [],
    upsertShifts: [],
  };
  const dateKeys = new Set([
    ...Object.keys(previousState),
    ...Object.keys(currentState),
  ]);

  for (const dateKey of dateKeys) {
    const previousDay = getDayState(previousState, dateKey);
    const currentDay = getDayState(currentState, dateKey);

    if (previousDay.status !== currentDay.status) {
      changes.statusChanges.push({
        type: "setStatus",
        userId,
        dateKey,
        status: currentDay.status,
      });
    }

    const previousEntries = Object.fromEntries(
      getValidEntries(previousState, dateKey).map((entry) => [entry.shift.id, entry]),
    );
    const currentEntries = Object.fromEntries(
      getValidEntries(currentState, dateKey).map((entry) => [entry.shift.id, entry]),
    );

    for (const [shiftId, previousEntry] of Object.entries(previousEntries)) {
      const currentEntry = currentEntries[shiftId];
      if (currentEntry && shiftsAreEqual(previousEntry.shift, currentEntry.shift)) {
        continue;
      }
      changes.removedShiftIds.push({ type: "removeShift", userId, shiftId });
    }

    for (const [shiftId, currentEntry] of Object.entries(currentEntries)) {
      const previousEntry = previousEntries[shiftId];
      if (previousEntry && shiftsAreEqual(previousEntry.shift, currentEntry.shift)) {
        continue;
      }
      changes.upsertShifts.push({
        type: "upsertShift",
        userId,
        dateKey,
        shift: currentEntry.shift,
      });
    }
  }

  return changes;
};
