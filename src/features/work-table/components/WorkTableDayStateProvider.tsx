import { ReactNode, useMemo, useReducer, useState } from "react";

import {
  WorkTableDayStateContext,
  workTableDayStateReducer,
} from "@/features/work-table/hooks/workTableDayStateContext";

type WorkTableDayStateProviderProps = {
  children: ReactNode;
};

export const WorkTableDayStateProvider = ({
  children,
}: WorkTableDayStateProviderProps) => {
  const [state, dispatch] = useReducer(workTableDayStateReducer, {});
  const [hydrated, setHydrated] = useState(false);
  const value = useMemo(
    () => ({ state, dispatch, hydrated, setHydrated }),
    [state, hydrated],
  );

  return (
    <WorkTableDayStateContext.Provider value={value}>
      {children}
    </WorkTableDayStateContext.Provider>
  );
};
