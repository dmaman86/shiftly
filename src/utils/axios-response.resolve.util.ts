import type { AxiosResponse } from "axios";
import { ApiResponse } from "@/domain";
import { resolveErrorMessage } from "./axios-error.resolve.util";

export const toApiResponse = async <T>(
  request: Promise<AxiosResponse<T>>,
): Promise<ApiResponse<T>> => {
  try {
    const response = await request;
    return { data: response.data };
  } catch (err: unknown) {
    return { error: resolveErrorMessage(err) };
  }
};
