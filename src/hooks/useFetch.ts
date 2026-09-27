import { useCallback, useEffect, useRef, useState } from "react";
import { ApiResponse, EndpointCall } from "@/domain";
import { resolveErrorMessage } from "@/utils";

export const useFetch = () => {
  const [loading, setLoading] = useState(false);
  const activeRequestsRef = useRef(
    new Map<number, AbortController | undefined>(),
  );
  const requestIdRef = useRef(0);

  const callEndPoint = useCallback(
    async <T, R = T>(
      endpoint: EndpointCall<T>,
      adapter?: (raw: T) => R,
    ): Promise<ApiResponse<R>> => {
      const requestId = requestIdRef.current++;
      activeRequestsRef.current.set(requestId, endpoint.controller);
      setLoading(true);

      try {
        const result = await endpoint.call();
        if (result.error !== undefined) return { error: result.error };

        const raw = result.data as T;
        return {
          data: adapter ? adapter(raw) : (raw as unknown as R),
        };
      } catch (err: unknown) {
        return { error: resolveErrorMessage(err) };
      } finally {
        if (activeRequestsRef.current.delete(requestId)) {
          setLoading(activeRequestsRef.current.size > 0);
        }
      }
    },
    [],
  );

  const cancelEndPoint = useCallback(() => {
    for (const controller of activeRequestsRef.current.values()) {
      controller?.abort();
    }

    activeRequestsRef.current.clear();
    setLoading(false);
  }, []);

  useEffect(() => {
    return () => cancelEndPoint();
  }, [cancelEndPoint]);

  return { loading, callEndPoint, cancelEndPoint };
};
