import { useEffect, useState } from "react";
import { AxiosResponse } from "axios";
import { ApiResponse } from "@/models";

interface AxiosCall<T> {
  call: Promise<AxiosResponse<T>>;
  controller?: AbortController;
}

export const useFetch = () => {
  const [loading, setLoading] = useState(false);
  let controller: AbortController;

  const buildEventMap = (
    items: { date: string; title: string }[],
  ): Record<string, string[]> => {
    const eventMap: Record<string, string[]> = {};

    items.forEach((item) => {
      const date = item.date.split("T")[0];
      if (!eventMap[date]) eventMap[date] = [];
      eventMap[date].push(item.title);
    });
    return eventMap;
  };

  const callEndPoint = async (
    axiosCall: AxiosCall<any>,
  ): Promise<ApiResponse> => {
    const response: ApiResponse = { data: null, error: null };

    if (axiosCall.controller) controller = axiosCall.controller;
    setLoading(true);
    try {
      const result = await axiosCall.call;
      const rawItems: { date: string; title: string }[] = result.data.items;
      response.data = buildEventMap(rawItems);
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
