import { useCallback, useEffect, useRef, useState } from "react";
import { AxiosResponse } from "axios";
import { ApiResponse } from "@/domain";
import { resolveErrorMessage } from "@/utils";

interface AxiosCall {
  call: () => Promise<AxiosResponse>;
  controller?: AbortController;
}

export const useFetch = () => {
  const [loading, setLoading] = useState(false);
  const controllerRef = useRef<AbortController | undefined>(undefined);

  const callEndPoint = useCallback(
    async <T>(
      axiosCall: AxiosCall,
      adapter?: (raw: { date: string; title: string }[]) => T,
    ): Promise<ApiResponse<T>> => {
      if (axiosCall.controller) controllerRef.current = axiosCall.controller;

      setLoading(true);

      try {
        const result = await axiosCall.call();
        const rawItems: { date: string; title: string }[] = result.data.items;
        const data = adapter ? adapter(rawItems) : (rawItems as T);
        return { data };
      } catch (err: unknown) {
        return { data: undefined as T, error: resolveErrorMessage(err) };
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const cancelEndPoint = useCallback(() => {
    setLoading(false);
    controllerRef.current?.abort();
  }, []);

  useEffect(() => {
    return () => cancelEndPoint();
  }, [cancelEndPoint]);

  return { loading, callEndPoint, cancelEndPoint };
};
