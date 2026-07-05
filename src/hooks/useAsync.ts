import { useEffect, useRef, DependencyList } from "react";

export const useAsync = <T>(
  asyncRequest: () => Promise<T>,
  onResult: (response: T) => void,
  deps: DependencyList = [],
  cleanup?: () => void,
) => {
  const asyncRequestRef = useRef(asyncRequest);
  const onResultRef = useRef(onResult);
  const cleanupRef = useRef(cleanup);

  asyncRequestRef.current = asyncRequest;
  onResultRef.current = onResult;
  cleanupRef.current = cleanup;

  // deps controls WHEN to fire; refs ensure no stale closures on the callbacks.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    let isActive = true;

    asyncRequestRef.current().then((result) => {
      if (isActive) onResultRef.current(result);
    });

    return () => {
      isActive = false;
      cleanupRef.current?.();
    };
  }, deps);
};
