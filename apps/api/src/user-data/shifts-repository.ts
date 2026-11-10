import { UserDataError } from "./errors.ts";
import { monthRange, type MonthPeriod } from "./month-period.ts";
import { dataOrThrow, type UserScope } from "./user-scope.ts";

/** One shift, as the API returns and receives it. */
export type Shift = {
  readonly id: string;
  /** The day the shift belongs to (YYYY-MM-DD). */
  readonly date: string;
  /** Instants with an offset; a night shift ends the next day. */
  readonly startTime: string;
  readonly endTime: string;
  readonly isDuty: boolean;
};

type ShiftRow = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_duty: boolean;
};

const TABLE = "shifts";

const toShift = (row: ShiftRow): Shift => ({
  id: row.id,
  date: row.date,
  startTime: row.start_time,
  endTime: row.end_time,
  isDuty: row.is_duty,
});

/**
 * The caller's shifts. Ids come from the browser, and shifts have no unique
 * key that includes user_id, so a save goes through api_upsert_shift: insert,
 * or update only when the shift is the caller's, in one statement.
 */
export const shiftsRepository = (scope: UserScope) => ({
  inMonth: async (period: MonthPeriod): Promise<Shift[]> => {
    const { start, end } = monthRange(period);
    const rows = await dataOrThrow(
      scope
        .select(TABLE, "id, date, start_time, end_time, is_duty")
        .gte("date", start)
        .lt("date", end)
        .order("start_time")
        .returns<ShiftRow[]>(),
    );
    return (rows ?? []).map(toShift);
  },

  /** Throws not_found when the id is another user's: same answer as a missing one. */
  save: async (shift: Shift): Promise<void> => {
    const saved = await dataOrThrow(
      scope
        .rpc("api_upsert_shift", {
          p_id: shift.id,
          p_date: shift.date,
          p_start_time: shift.startTime,
          p_end_time: shift.endTime,
          p_is_duty: shift.isDuty,
        })
        .returns<boolean>(),
    );
    if (saved !== true) throw new UserDataError("not_found", "Shift not found");
  },

  /** Idempotent: removing a shift that is not the caller's changes nothing. */
  remove: async (id: string): Promise<void> => {
    await dataOrThrow(scope.delete(TABLE).eq("id", id));
  },
});
