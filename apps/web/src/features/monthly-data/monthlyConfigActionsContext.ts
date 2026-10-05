import { createContext, useContext } from "react";
import { useGlobalStore } from "@/store/globalStore";

type MonthlyConfigActions = {
  updateStandardHours: (value: number) => void;
  updateBaseRate: (value: number) => void;
};

// Isolated guest editors can work without a remote monthly session.
export const MonthlyConfigActionsContext = createContext<MonthlyConfigActions>({
  updateStandardHours: (value) =>
    useGlobalStore.getState().updateStandardHours(value),
  updateBaseRate: (value) => useGlobalStore.getState().updateBaseRate(value),
});

export const useMonthlyConfigActions = () =>
  useContext(MonthlyConfigActionsContext);
