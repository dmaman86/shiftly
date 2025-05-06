import { ApiResponse } from "@/models";
import { useEffect } from "react";

export const useAsync = (
  asyncFunc: () => Promise<ApiResponse>,
  onSuccess: (result: ApiResponse) => void,
  returnFunc: () => void,
  dependencies: any[] = [],
) => {
  useEffect(() => {
    let isActive = true;
    asyncFunc().then((result) => {
      if (isActive) onSuccess(result);
    });

    return () => {
      if (returnFunc) returnFunc();
      isActive = false;
    };
  }, [dependencies]);
};
