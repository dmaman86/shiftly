import { useCallback, useEffect, useRef, useState } from "react";
import type { AxiosResponse } from "axios";
import { ApiResponse } from "@/domain";
import { resolveErrorMessage } from "@/utils";

interface AxiosCall {
  call: () => Promise<AxiosResponse<unknown>>;
  controller?: AbortController;
}

export const useFetch = () => {
  const [loading, setLoading] = useState(false);
  const controllerRef = useRef<AbortController | undefined>(undefined);

  const callEndPoint = useCallback(
    async <T>(
      axiosCall: AxiosCall,
      adapter?: (raw: unknown) => T,
    ): Promise<ApiResponse<T>> => {
      if (axiosCall.controller) controllerRef.current = axiosCall.controller;

      setLoading(true);

      try {
        const result = await axiosCall.call();
        const data = adapter ? adapter(result.data) : (result.data as T);
        return { data };
      } catch (err: unknown) {
        return { error: resolveErrorMessage(err) };
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
