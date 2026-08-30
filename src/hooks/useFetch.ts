import { useCallback, useEffect, useRef, useState } from "react";
import { ApiResponse } from "@/domain";
import { resolveErrorMessage } from "@/utils";

export interface EndpointCall<T> {
  call: () => Promise<ApiResponse<T>>;
  controller?: AbortController;
}

export const useFetch = () => {
  const [loading, setLoading] = useState(false);
  const controllerRef = useRef<AbortController | undefined>(undefined);

  const callEndPoint = useCallback(
    async <T, R = T>(
      endpoint: EndpointCall<T>,
      adapter?: (raw: T) => R,
    ): Promise<ApiResponse<R>> => {
      if (endpoint.controller) controllerRef.current = endpoint.controller;

      setLoading(true);

      try {
        const result = await endpoint.call();
        if (result.error) return { error: result.error };
        const raw = result.data as T;
        return { data: adapter ? adapter(raw) : (raw as unknown as R) };
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
