import { createContext, useContext } from "react";

export type MonthlyConfigValues = {
  standardHours: number;
  baseRate: number;
};

export type MonthlyConfigHydration = {
  configReady: boolean;
  contextKey: string | null;
  hydratedValues: MonthlyConfigValues | null;
};

export const getMonthlyContextKey = (
  userId: string | undefined,
  year: number,
  month: number,
) => `${userId ?? "guest"}:${year}:${month}`;

export const MonthlyConfigHydrationContext =
  createContext<MonthlyConfigHydration>({
    configReady: true,
    contextKey: null,
    hydratedValues: null,
  });

export const useMonthlyConfigHydration = () =>
  useContext(MonthlyConfigHydrationContext);
