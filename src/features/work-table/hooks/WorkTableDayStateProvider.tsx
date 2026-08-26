import { ReactNode, useMemo, useReducer } from "react";

import {
  WorkTableDayStateContext,
  workTableDayStateReducer,
} from "./workTableDayStateContext";

type WorkTableDayStateProviderProps = {
  children: ReactNode;
};

export const WorkTableDayStateProvider = ({
  children,
}: WorkTableDayStateProviderProps) => {
  const [state, dispatch] = useReducer(workTableDayStateReducer, {});
  const value = useMemo(() => ({ state, dispatch }), [state]);

  return (
    <WorkTableDayStateContext.Provider value={value}>
      {children}
    </WorkTableDayStateContext.Provider>
  );
};
