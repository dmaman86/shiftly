import { WorkDayStatus } from "@shiftly/domain";
import type { ShiftRecord } from "@/services/shift/shift.service";
import type { WorkDayRecord } from "@/services/workDay/workDay.service";

export type GuestDraft = {
  version: 1;
  savedAt: string;
  year: number;
  month: number;
  config: { standardHours: number; baseRate: number };
  days: WorkDayRecord[];
  // Ids are kept only so the draft mirrors the persisted shape; the import
  // never sends them and the server generates its own.
  shifts: ShiftRecord[];
};

// sessionStorage (not localStorage): it survives the same-tab OAuth redirect
// but is never shared across tabs or kept after the tab closes, so guests do
// not get persistence through the back door.
const DRAFT_KEY = "shiftly:guest-draft";
const PENDING_IMPORT_KEY = "shiftly:guest-draft:pending-import";

export const GUEST_DRAFT_TTL_MS = 30 * 60 * 1000;

// Mirrors the limits enforced by the import_guest_month SQL function.
const MIN_YEAR = 2015;
const MAX_YEAR = 2100;
const MAX_DAYS = 31;
const MAX_SHIFTS = 200;

const PERSISTED_STATUSES: readonly string[] = [
  WorkDayStatus.vacation,
  WorkDayStatus.sick,
];

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonNegativeNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0;

const isIntegerInRange = (
  value: unknown,
  min: number,
  max: number,
): value is number =>
  Number.isInteger(value) &&
  (value as number) >= min &&
  (value as number) <= max;

const toTimestamp = (value: unknown): number | null => {
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : timestamp;
};

const monthPrefix = (year: number, month: number) =>
  `${year}-${String(month).padStart(2, "0")}-`;

const isDateInMonth = (value: unknown, prefix: string): value is string =>
  typeof value === "string" &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  value.startsWith(prefix);

const isValidDay = (value: unknown, prefix: string): value is WorkDayRecord =>
  isRecord(value) &&
  isDateInMonth(value.date, prefix) &&
  typeof value.status === "string" &&
  PERSISTED_STATUSES.includes(value.status);

const isValidShift = (value: unknown, prefix: string): value is ShiftRecord => {
  if (!isRecord(value)) return false;

  const start = toTimestamp(value.start_time);
  const end = toTimestamp(value.end_time);

  return (
    typeof value.id === "string" &&
    isDateInMonth(value.date, prefix) &&
    start !== null &&
    end !== null &&
    start < end &&
    typeof value.is_duty === "boolean"
  );
};

export const parseGuestDraft = (value: unknown): GuestDraft | null => {
  if (!isRecord(value) || value.version !== 1) return null;

  const { savedAt, year, month, config, days, shifts } = value;

  if (toTimestamp(savedAt) === null) return null;
  if (!isIntegerInRange(year, MIN_YEAR, MAX_YEAR)) return null;
  if (!isIntegerInRange(month, 1, 12)) return null;
  if (
    !isRecord(config) ||
    !isNonNegativeNumber(config.standardHours) ||
    !isNonNegativeNumber(config.baseRate)
  ) {
    return null;
  }

  const prefix = monthPrefix(year, month);

  if (
    !Array.isArray(days) ||
    days.length > MAX_DAYS ||
    !days.every((day) => isValidDay(day, prefix))
  ) {
    return null;
  }
  if (
    !Array.isArray(shifts) ||
    shifts.length > MAX_SHIFTS ||
    !shifts.every((shift) => isValidShift(shift, prefix))
  ) {
    return null;
  }

  return value as GuestDraft;
};

export const isGuestDraftEmpty = (draft: GuestDraft) =>
  draft.days.length === 0 && draft.shifts.length === 0;

// Storage access can throw (disabled storage, quota, privacy modes). A failure
// here must never break the calculator, so it degrades to "no draft".
const safely = <T>(operation: () => T, fallback: T): T => {
  try {
    return operation();
  } catch (error) {
    console.warn("Guest draft storage is unavailable", error);
    return fallback;
  }
};

const discard = () =>
  safely(() => {
    sessionStorage.removeItem(DRAFT_KEY);
    sessionStorage.removeItem(PENDING_IMPORT_KEY);
  }, undefined);

export const guestDraftStorage = {
  save(draft: GuestDraft) {
    safely(() => {
      if (isGuestDraftEmpty(draft)) {
        sessionStorage.removeItem(DRAFT_KEY);
        return;
      }
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    }, undefined);
  },

  markPendingImport() {
    safely(() => sessionStorage.setItem(PENDING_IMPORT_KEY, "1"), undefined);
  },

  clearPendingImport() {
    safely(() => sessionStorage.removeItem(PENDING_IMPORT_KEY), undefined);
  },

  /**
   * Returns the draft only right after an explicit sign-in attempt. It does
   * not clear storage: the draft must survive until the sign-in outcome is
   * known, so the caller discards it once the import or restore is resolved.
   * Anything else (plain reload, unusable draft) is discarded here, since
   * nothing will ever resolve it.
   */
  readPending(now = Date.now()): GuestDraft | null {
    const { isPending, raw } = safely(
      () => ({
        isPending: sessionStorage.getItem(PENDING_IMPORT_KEY) !== null,
        raw: sessionStorage.getItem(DRAFT_KEY),
      }),
      { isPending: false, raw: null },
    );
    const draft =
      isPending && raw !== null
        ? safely(() => parseGuestDraft(JSON.parse(raw)), null)
        : null;
    if (
      !draft ||
      isGuestDraftEmpty(draft) ||
      now - Date.parse(draft.savedAt) > GUEST_DRAFT_TTL_MS
    ) {
      discard();
      return null;
    }

    return draft;
  },

  discard,
};
