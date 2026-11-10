import { WorkDayStatus } from "@shiftly/domain";
import type { ApiResponse, EndpointCall } from "@/app/types/api.types";
import { apiClient } from "@/services/api/client";

export interface WorkDayRecord {
  date: string;
  status: WorkDayStatus;
}

const STATUSES = new Set<string>(Object.values(WorkDayStatus));

const isWorkDayRecord = (value: unknown): value is WorkDayRecord => {
  if (typeof value !== "object" || value === null) return false;
  const day = value as Record<string, unknown>;
  return (
    typeof day.date === "string" &&
    typeof day.status === "string" &&
    STATUSES.has(day.status)
  );
};

// The API takes the user from the session token alone. `ownerId` is the
// account a call was made for: it is never sent, and if another account has
// signed in since, the call is not sent at all (see ApiRequest.expectedUserId).
export const workDayService = () => {
  const fetchForMonth = (
    ownerId: string,
    year: number,
    month: number,
  ): EndpointCall<WorkDayRecord[]> => ({
    call: async (): Promise<ApiResponse<WorkDayRecord[]>> => {
      const result = await apiClient.request<{ workDays: unknown }>({
        method: "GET",
        path: `/me/months/${year}/${month}/work-days`,
        authenticated: true,
        expectedUserId: ownerId,
      });
      if (result.error !== undefined) return { error: result.error };
      const workDays = result.data?.workDays;
      if (!Array.isArray(workDays) || !workDays.every(isWorkDayRecord)) {
        return { error: "invalid_response" };
      }
      return { data: workDays };
    },
  });

  // "normal" is the implicit default (row absence = normal): the API deletes
  // the day's row instead of storing it.
  const setStatus = (
    ownerId: string,
    date: string,
    status: WorkDayStatus,
  ): EndpointCall<null> => ({
    call: () =>
      apiClient.request<null>({
        method: "PUT",
        path: `/me/work-days/${date}`,
        body: { status },
        authenticated: true,
        expectedUserId: ownerId,
      }),
  });

  return { fetchForMonth, setStatus };
};
