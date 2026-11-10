import type { MonthPeriod } from "./month-period.ts";
import { dataOrThrow, type UserScope } from "./user-scope.ts";

/** The month a guest filled in before signing in. */
export type GuestMonth = {
  readonly standardHours: number;
  readonly baseRate: number;
  readonly days: readonly {
    readonly date: string;
    readonly status: "vacation" | "sick";
  }[];
  /** No ids: the database generates them. */
  readonly shifts: readonly {
    readonly date: string;
    readonly startTime: string;
    readonly endTime: string;
    readonly isDuty: boolean;
  }[];
};

/**
 * Replaces one of the caller's months with a guest's draft. One database
 * function, one transaction: the month is fully replaced or left untouched.
 * The Shabbat credit of the month is kept.
 */
export const guestImportRepository = (scope: UserScope) => ({
  importMonth: async (
    { year, month }: MonthPeriod,
    guest: GuestMonth,
  ): Promise<void> => {
    await dataOrThrow(
      scope.rpc("api_import_guest_month", {
        p_year: year,
        p_month: month,
        p_standard_hours: guest.standardHours,
        p_base_rate: guest.baseRate,
        p_days: guest.days,
        p_shifts: guest.shifts.map((shift) => ({
          date: shift.date,
          start_time: shift.startTime,
          end_time: shift.endTime,
          is_duty: shift.isDuty,
        })),
      }),
    );
  },
});
