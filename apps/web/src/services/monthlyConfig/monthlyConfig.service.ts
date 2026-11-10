import type { ApiResponse, EndpointCall } from "@/app/types/api.types";
import { apiClient } from "@/services/api/client";

export interface MonthlyConfigRecord {
  year: number;
  month: number;
  standard_hours: number;
  base_rate: number;
  unused_shabbat_credit_hours: number;
}

/** How apps/api returns a month's settings (GET /me/months/:y/:m/config). */
type MonthlyConfigDto = {
  standardHours: number;
  baseRate: number;
  unusedShabbatCreditHours: number;
};

const isMonthlyConfigDto = (value: unknown): value is MonthlyConfigDto => {
  if (typeof value !== "object" || value === null) return false;
  const dto = value as Record<string, unknown>;
  return (
    typeof dto.standardHours === "number" &&
    typeof dto.baseRate === "number" &&
    typeof dto.unusedShabbatCreditHours === "number"
  );
};

const monthPath = (year: number, month: number) =>
  `/me/months/${year}/${month}`;

// The API takes the user from the session token alone. `ownerId` is the
// account a call was made for: it is never sent, and if another account has
// signed in since, the call is not sent at all (see ApiRequest.expectedUserId).
export const monthlyConfigService = () => {
  const fetch = (
    ownerId: string,
    year: number,
    month: number,
  ): EndpointCall<MonthlyConfigRecord | null> => ({
    call: async (): Promise<ApiResponse<MonthlyConfigRecord | null>> => {
      const result = await apiClient.request<{ config: unknown }>({
        method: "GET",
        path: `${monthPath(year, month)}/config`,
        authenticated: true,
        expectedUserId: ownerId,
      });
      if (result.error !== undefined) return { error: result.error };
      const { config } = result.data ?? {};
      if (config === null) return { data: null };
      if (!isMonthlyConfigDto(config)) return { error: "invalid_response" };
      return {
        data: {
          year,
          month,
          standard_hours: config.standardHours,
          base_rate: config.baseRate,
          unused_shabbat_credit_hours: config.unusedShabbatCreditHours,
        },
      };
    },
  });

  const upsert = (
    ownerId: string,
    record: Pick<
      MonthlyConfigRecord,
      "year" | "month" | "standard_hours" | "base_rate"
    >,
  ): EndpointCall<null> => ({
    call: () =>
      apiClient.request<null>({
        method: "PUT",
        path: `${monthPath(record.year, record.month)}/config`,
        body: {
          standardHours: record.standard_hours,
          baseRate: record.base_rate,
        },
        authenticated: true,
        expectedUserId: ownerId,
      }),
  });

  // Written by the salary-summary feature's carry-over sync, kept separate
  // from `upsert` (user-edited settings) since this value is derived from the
  // month's calculation, not typed by the user.
  const setUnusedShabbatCreditHours = (
    ownerId: string,
    year: number,
    month: number,
    hours: number,
  ): EndpointCall<null> => ({
    call: () =>
      apiClient.request<null>({
        method: "PUT",
        path: `${monthPath(year, month)}/shabbat-credit`,
        body: { hours },
        authenticated: true,
        expectedUserId: ownerId,
      }),
  });

  return { fetch, upsert, setUnusedShabbatCreditHours };
};
