import { useEffect, useEffectEvent, type DependencyList } from "react";

export const useAsync = <T>(
  asyncRequest: () => Promise<T>,
  deps: DependencyList,
  onResult: (response: T) => void,
  cleanup?: () => void,
) => {
  const asyncRequestEvent = useEffectEvent(asyncRequest);
  const onResultEvent = useEffectEvent(onResult);
  const cleanupEvent = useEffectEvent(() => cleanup?.());

  useEffect(() => {
    let isActive = true;

    void asyncRequestEvent().then((result) => {
      if (isActive) onResultEvent(result);
    });

    return () => {
      isActive = false;
      cleanupEvent();
    };

    // Dependencies are statically validated at useAsync call sites.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
};
