import { monthRange, type MonthPeriod } from "../user-data/month-period.ts";
import { dataOrThrow, type UserScope } from "./user-scope.ts";

export const WORK_DAY_STATUSES = ["normal", "vacation", "sick"] as const;
export type WorkDayStatus = (typeof WORK_DAY_STATUSES)[number];

/** A day the user marked; "normal" days are never stored. */
export type WorkDay = {
  readonly date: string;
  readonly status: Exclude<WorkDayStatus, "normal">;
};

const TABLE = "work_days";
/** Includes user_id, so a write can only ever meet the caller's own row. */
const ONE_PER_DAY = "user_id,date";

/**
 * The caller's day statuses. "normal" is the implicit default: it is never
 * written, and setting a day back to normal deletes its row instead of
 * leaving a stale one behind.
 */
export const workDaysRepository = (scope: UserScope) => ({
  inMonth: async (period: MonthPeriod): Promise<WorkDay[]> => {
    const { start, end } = monthRange(period);
    const rows = await dataOrThrow(
      scope
        .select(TABLE, "date, status")
        .gte("date", start)
        .lt("date", end)
        .order("date")
        .returns<WorkDay[]>(),
    );
    return rows ?? [];
  },

  setStatus: async (date: string, status: WorkDayStatus): Promise<void> => {
    if (status === "normal") {
      await dataOrThrow(scope.delete(TABLE).eq("date", date));
      return;
    }
    await dataOrThrow(
      scope.upsert(
        TABLE,
        { date, status, updated_at: new Date().toISOString() },
        ONE_PER_DAY,
      ),
    );
  },
});
