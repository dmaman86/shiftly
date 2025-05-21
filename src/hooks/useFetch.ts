import { useEffect, useState } from "react";
import { AxiosResponse } from "axios";
import { ApiResponse } from "@/domain";

interface AxiosCall {
  call: Promise<AxiosResponse>;
  controller?: AbortController;
}

export const useFetch = () => {
  const [loading, setLoading] = useState(false);
  let controller: AbortController;

  const callEndPoint = async <T>(
    axiosCall: AxiosCall,
    adapter?: (raw: { date: string; title: string }[]) => T,
  ): Promise<ApiResponse<T>> => {
    const response: ApiResponse<T> = { data: null, error: null };

    if (axiosCall.controller) controller = axiosCall.controller;
    setLoading(true);
    try {
      const result = await axiosCall.call;
      const rawItems: { date: string; title: string }[] = result.data.items;
      response.data = adapter ? adapter(rawItems) : (rawItems as T);
    } catch (err: any) {
      response.error = err?.message ?? "שגיאה לא צפויה. אנא נסה שוב";
    } finally {
      setLoading(false);
    }
    return response;
  };

  const cancelEndPoint = () => {
    setLoading(false);
    if (controller) controller.abort();
  };

  useEffect(() => {
    return () => {
      cancelEndPoint();
    };
  }, []);

  return { loading, callEndPoint };
};
