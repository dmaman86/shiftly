import { WorkDayStatus } from "@shiftly/domain";
import { supabaseCrud } from "@/services/supabase/supabase.crud";

export interface WorkDayRecord {
  date: string;
  status: WorkDayStatus;
}

export const workDayService = () => {
  const fetchForMonth = (userId: string, startDate: string, endDate: string) =>
    supabaseCrud.select<WorkDayRecord>("work_days", {
      select: "date, status",
      filters: [
        { column: "user_id", operator: "eq", value: userId },
        { column: "date", operator: "gte", value: startDate },
        { column: "date", operator: "lt", value: endDate },
      ],
    });

  // "normal" is the implicit default (row absence = normal), so it's never
  // written - only non-normal statuses are stored, and reverting to normal
  // deletes the row instead of leaving stale data behind.
  const setStatus = (userId: string, date: string, status: WorkDayStatus) => ({
    call: async () => {
      if (status === WorkDayStatus.normal) {
        return supabaseCrud
          .remove("work_days", [
            { column: "user_id", operator: "eq", value: userId },
            { column: "date", operator: "eq", value: date },
          ])
          .call();
      }

      return supabaseCrud
        .upsert(
          "work_days",
          {
            user_id: userId,
            date,
            status,
            updated_at: new Date().toISOString(),
          },
          "user_id,date",
        )
        .call();
    },
  });

  return { fetchForMonth, setStatus };
};
