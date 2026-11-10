import { Shift } from "@shiftly/domain";
import { DateService } from "@shiftly/domain";
import type { ApiResponse, EndpointCall } from "@/app/types/api.types";
import { apiClient } from "@/services/api/client";

export interface ShiftRecord {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_duty: boolean;
}

/** How apps/api returns a shift (GET /me/months/:y/:m/shifts). */
type ShiftDto = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  isDuty: boolean;
};

const isShiftDto = (value: unknown): value is ShiftDto => {
  if (typeof value !== "object" || value === null) return false;
  const shift = value as Record<string, unknown>;
  return (
    typeof shift.id === "string" &&
    typeof shift.date === "string" &&
    typeof shift.startTime === "string" &&
    typeof shift.endTime === "string" &&
    typeof shift.isDuty === "boolean"
  );
};

const toShiftRecord = (shift: ShiftDto): ShiftRecord => ({
  id: shift.id,
  date: shift.date,
  start_time: shift.startTime,
  end_time: shift.endTime,
  is_duty: shift.isDuty,
});

// The API takes the user from the session token alone. `ownerId` is the
// account a call was made for: it is never sent, and if another account has
// signed in since, the call is not sent at all (see ApiRequest.expectedUserId).
export const shiftService = () => {
  const dateService = new DateService();

  const fetchForMonth = (
    ownerId: string,
    year: number,
    month: number,
  ): EndpointCall<ShiftRecord[]> => ({
    call: async (): Promise<ApiResponse<ShiftRecord[]>> => {
      const result = await apiClient.request<{ shifts: unknown }>({
        method: "GET",
        path: `/me/months/${year}/${month}/shifts`,
        authenticated: true,
        expectedUserId: ownerId,
      });
      if (result.error !== undefined) return { error: result.error };
      const shifts = result.data?.shifts;
      if (!Array.isArray(shifts) || !shifts.every(isShiftDto)) {
        return { error: "invalid_response" };
      }
      return { data: shifts.map(toShiftRecord) };
    },
  });

  // The id is generated in the browser. The API answers not_found when it
  // belongs to another account, and never overwrites that shift.
  const upsert = (
    ownerId: string,
    date: string,
    shift: Shift,
  ): EndpointCall<null> => ({
    call: () =>
      apiClient.request<null>({
        method: "PUT",
        path: `/me/shifts/${shift.id}`,
        body: {
          date,
          startTime: dateService.toPersistedDateTime(shift.start.date),
          endTime: dateService.toPersistedDateTime(shift.end.date),
          isDuty: shift.isDuty,
        },
        authenticated: true,
        expectedUserId: ownerId,
      }),
  });

  const remove = (ownerId: string, shiftId: string): EndpointCall<null> => ({
    call: () =>
      apiClient.request<null>({
        method: "DELETE",
        path: `/me/shifts/${shiftId}`,
        authenticated: true,
        expectedUserId: ownerId,
      }),
  });

  return { fetchForMonth, upsert, remove };
};
