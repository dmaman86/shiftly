import { WorkDayStatus } from "@/constants";
import { supabase } from "@/services/supabase/supabase.client";
import { fromSupabaseResult } from "@/utils";

export interface WorkDayRecord {
  date: string;
  status: WorkDayStatus;
}

export const workDayService = () => {
  const fetchForMonth = (userId: string, startDate: string, endDate: string) => ({
    call: async () =>
      fromSupabaseResult<WorkDayRecord[]>(
        await supabase
          .from("work_days")
          .select("date, status")
          .eq("user_id", userId)
          .gte("date", startDate)
          .lt("date", endDate),
      ),
  });

  // "normal" is the implicit default (row absence = normal), so it's never
  // written - only non-normal statuses are stored, and reverting to normal
  // deletes the row instead of leaving stale data behind.
  const setStatus = (userId: string, date: string, status: WorkDayStatus) => ({
    call: async () => {
      if (status === WorkDayStatus.normal) {
        return fromSupabaseResult<null>(
          await supabase.from("work_days").delete().eq("user_id", userId).eq("date", date),
        );
      }

      return fromSupabaseResult<null>(
        await supabase.from("work_days").upsert(
          { user_id: userId, date, status, updated_at: new Date().toISOString() },
          { onConflict: "user_id,date" },
        ),
      );
    },
  });

  return { fetchForMonth, setStatus };
};
