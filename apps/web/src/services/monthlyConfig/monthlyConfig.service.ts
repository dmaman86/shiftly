import { supabaseCrud } from "@/services/supabase/supabase.crud";

export interface MonthlyConfigRecord {
  year: number;
  month: number;
  standard_hours: number;
  base_rate: number;
  unused_shabbat_credit_hours: number;
}

export const monthlyConfigService = () => {
  const fetch = (userId: string, year: number, month: number) =>
    supabaseCrud.selectOne<MonthlyConfigRecord>("monthly_configs", {
      select:
        "year, month, standard_hours, base_rate, unused_shabbat_credit_hours",
      filters: [
        { column: "user_id", operator: "eq", value: userId },
        { column: "year", operator: "eq", value: year },
        { column: "month", operator: "eq", value: month },
      ],
    });

  const upsert = (
    userId: string,
    record: Pick<
      MonthlyConfigRecord,
      "year" | "month" | "standard_hours" | "base_rate"
    >,
  ) =>
    supabaseCrud.upsert(
      "monthly_configs",
      { user_id: userId, ...record, updated_at: new Date().toISOString() },
      "user_id,year,month",
    );

  // Written by the salary-summary feature's carry-over sync, kept separate
  // from `upsert` (user-edited settings) since this value is derived from the
  // month's calculation, not typed by the user.
  const setUnusedShabbatCreditHours = (
    userId: string,
    year: number,
    month: number,
    hours: number,
  ) =>
    supabaseCrud.upsert(
      "monthly_configs",
      {
        user_id: userId,
        year,
        month,
        unused_shabbat_credit_hours: hours,
        updated_at: new Date().toISOString(),
      },
      "user_id,year,month",
    );

  return { fetch, upsert, setUnusedShabbatCreditHours };
};
