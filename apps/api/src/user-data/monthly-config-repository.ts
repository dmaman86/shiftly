import type { MonthPeriod } from "./month-period.ts";
import { dataOrThrow, type UserScope } from "./user-scope.ts";

/** One month's settings, as the API returns them. */
export type MonthlyConfig = {
  readonly standardHours: number;
  readonly baseRate: number;
  /** Carry-over balance derived from the month's calculation. */
  readonly unusedShabbatCreditHours: number;
};

/** The settings a user types: never the Shabbat credit. */
export type MonthlySettings = Pick<MonthlyConfig, "standardHours" | "baseRate">;

type MonthlyConfigRow = {
  standard_hours: number;
  base_rate: number;
  unused_shabbat_credit_hours: number;
};

const TABLE = "monthly_configs";
const COLUMNS = "standard_hours, base_rate, unused_shabbat_credit_hours";
/** Includes user_id, so a write can only ever meet the caller's own row. */
const ONE_PER_MONTH = "user_id,year,month";

const toMonthlyConfig = (row: MonthlyConfigRow): MonthlyConfig => ({
  standardHours: Number(row.standard_hours),
  baseRate: Number(row.base_rate),
  unusedShabbatCreditHours: Number(row.unused_shabbat_credit_hours),
});

/**
 * The caller's monthly settings. Both writes are partial upserts: each sends
 * only its own columns, so saving the settings never resets the Shabbat
 * credit and syncing the credit never resets the settings. A month without a
 * row gets the table defaults for the columns a write leaves out.
 */
export const monthlyConfigRepository = (scope: UserScope) => ({
  find: async ({ year, month }: MonthPeriod): Promise<MonthlyConfig | null> => {
    const row = await dataOrThrow(
      scope
        .select(TABLE, COLUMNS)
        .eq("year", year)
        .eq("month", month)
        .maybeSingle<MonthlyConfigRow>(),
    );
    return row ? toMonthlyConfig(row) : null;
  },

  saveSettings: async (
    { year, month }: MonthPeriod,
    settings: MonthlySettings,
  ): Promise<void> => {
    await dataOrThrow(
      scope.upsert(
        TABLE,
        {
          year,
          month,
          standard_hours: settings.standardHours,
          base_rate: settings.baseRate,
          updated_at: new Date().toISOString(),
        },
        ONE_PER_MONTH,
      ),
    );
  },

  saveShabbatCredit: async (
    { year, month }: MonthPeriod,
    hours: number,
  ): Promise<void> => {
    await dataOrThrow(
      scope.upsert(
        TABLE,
        {
          year,
          month,
          unused_shabbat_credit_hours: hours,
          updated_at: new Date().toISOString(),
        },
        ONE_PER_MONTH,
      ),
    );
  },
});
