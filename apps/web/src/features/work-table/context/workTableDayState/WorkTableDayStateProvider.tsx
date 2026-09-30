import { ReactNode, useMemo, useReducer, useState } from "react";

import {
  WorkTableDayStateContext,
  workTableDayStateReducer,
} from "./workTableDayStateContext";

type WorkTableDayStateProviderProps = {
  children: ReactNode;
  ownerKey?: string;
};

const DayStateProvider = ({
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

export const WorkTableDayStateProvider = ({
  children,
  ownerKey = "guest",
}: WorkTableDayStateProviderProps) => (
  <DayStateProvider key={ownerKey}>{children}</DayStateProvider>
);
