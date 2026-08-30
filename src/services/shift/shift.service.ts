import { Shift } from "@/domain";
import { supabase } from "@/services/supabase/supabase.client";
import { fromSupabaseResult } from "@/utils";

export interface ShiftRecord {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_duty: boolean;
}

export const shiftService = () => {
  const fetchForMonth = (userId: string, startDate: string, endDate: string) => ({
    call: async () =>
      fromSupabaseResult<ShiftRecord[]>(
        await supabase
          .from("shifts")
          .select("id, date, start_time, end_time, is_duty")
          .eq("user_id", userId)
          .gte("date", startDate)
          .lt("date", endDate),
      ),
  });

  const upsert = (userId: string, date: string, shift: Shift) => ({
    call: async () =>
      fromSupabaseResult<null>(
        await supabase.from("shifts").upsert({
          id: shift.id,
          user_id: userId,
          date,
          start_time: shift.start.date.toISOString(),
          end_time: shift.end.date.toISOString(),
          is_duty: shift.isDuty,
          updated_at: new Date().toISOString(),
        }),
      ),
  });

  const remove = (userId: string, shiftId: string) => ({
    call: async () =>
      fromSupabaseResult<null>(
        await supabase.from("shifts").delete().eq("user_id", userId).eq("id", shiftId),
      ),
  });

  return { fetchForMonth, upsert, remove };
};
