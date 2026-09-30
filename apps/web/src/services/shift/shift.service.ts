import { Shift } from "@shiftly/domain";
import { DateService } from "@shiftly/domain";
import { supabaseCrud } from "@/services/supabase/supabase.crud";

export interface ShiftRecord {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_duty: boolean;
}

export const shiftService = () => {
  const dateService = new DateService();
  const fetchForMonth = (userId: string, startDate: string, endDate: string) =>
    supabaseCrud.select<ShiftRecord>("shifts", {
      select: "id, date, start_time, end_time, is_duty",
      filters: [
        { column: "user_id", operator: "eq", value: userId },
        { column: "date", operator: "gte", value: startDate },
        { column: "date", operator: "lt", value: endDate },
      ],
    });

  const upsert = (userId: string, date: string, shift: Shift) =>
    supabaseCrud.upsert("shifts", {
      id: shift.id,
      user_id: userId,
      date,
      start_time: dateService.toPersistedDateTime(shift.start.date),
      end_time: dateService.toPersistedDateTime(shift.end.date),
      is_duty: shift.isDuty,
      updated_at: new Date().toISOString(),
    });

  const remove = (userId: string, shiftId: string) =>
    supabaseCrud.remove("shifts", [
      { column: "user_id", operator: "eq", value: userId },
      { column: "id", operator: "eq", value: shiftId },
    ]);

  return { fetchForMonth, upsert, remove };
};
