import { supabase } from "@/services/supabase/supabase.client";
import { fromSupabaseResult } from "@/utils";

export interface MonthlyConfigRecord {
  year: number;
  month: number;
  standard_hours: number;
  base_rate: number;
  unused_shabbat_credit_hours: number;
}

export const monthlyConfigService = () => {
  const fetch = (userId: string, year: number, month: number) => ({
    call: async () =>
      fromSupabaseResult<MonthlyConfigRecord | null>(
        await supabase
          .from("monthly_configs")
          .select("year, month, standard_hours, base_rate, unused_shabbat_credit_hours")
          .eq("user_id", userId)
          .eq("year", year)
          .eq("month", month)
          .maybeSingle(),
      ),
  });

  const upsert = (
    userId: string,
    record: Pick<MonthlyConfigRecord, "year" | "month" | "standard_hours" | "base_rate">,
  ) => ({
    call: async () =>
      fromSupabaseResult<null>(
        await supabase.from("monthly_configs").upsert(
          { user_id: userId, ...record, updated_at: new Date().toISOString() },
          { onConflict: "user_id,year,month" },
        ),
      ),
  });

  // Written by the salary-summary feature's carry-over sync, kept separate
  // from `upsert` (user-edited settings) since this value is derived from the
  // month's calculation, not typed by the user.
  const setUnusedShabbatCreditHours = (
    userId: string,
    year: number,
    month: number,
    hours: number,
  ) => ({
    call: async () =>
      fromSupabaseResult<null>(
        await supabase.from("monthly_configs").upsert(
          {
            user_id: userId,
            year,
            month,
            unused_shabbat_credit_hours: hours,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,year,month" },
        ),
      ),
  });

  return { fetch, upsert, setUnusedShabbatCreditHours };
};
