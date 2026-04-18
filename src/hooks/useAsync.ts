import { useEffect, DependencyList } from "react";

export const useAsync = <T>(
  asyncRequest: () => Promise<T>,
  onResult: (response: T) => void,
  deps: DependencyList = [],
  cleanup?: () => void,
) => {
  useEffect(() => {
    let isActive = true;

    asyncRequest().then((result) => {
      if (isActive) onResult(result);
    });

    return () => {
      isActive = false;
      cleanup?.();
    };
  }, deps);
};
