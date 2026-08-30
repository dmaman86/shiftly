import { ApiResponse } from "@/domain";

export const fromSupabaseResult = <T>(result: {
  data: unknown;
  error: { message: string } | null;
}): ApiResponse<T> =>
  result.error ? { error: result.error.message } : { data: result.data as T };
