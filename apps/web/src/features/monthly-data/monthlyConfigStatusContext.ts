import { createContext, useContext, type ReactNode } from "react";

export const MonthlyConfigStatusContext = createContext<{
  ready: boolean;
  contextKey: string;
  fallback?: ReactNode;
}>({ ready: true, contextKey: "isolated" });

export const useMonthlyConfigStatus = () => useContext(MonthlyConfigStatusContext);
