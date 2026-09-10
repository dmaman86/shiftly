import { create } from "zustand";

import type { WorkDayMap } from "@/domain";

export interface GlobalState {
  config: {
    standardHours: number;
    baseRate: number;
    year: number;
    month: number;
  };
  dailyPayMaps: Record<string, WorkDayMap>;
}

export interface GlobalStore extends GlobalState {
  updateYear: (year: number) => void;
  updateMonth: (month: number) => void;
  updateStandardHours: (standardHours: number) => void;
  updateBaseRate: (baseRate: number) => void;
  updateDayPayMap: (dateKey: string, dayPayMap: WorkDayMap) => void;
  replaceDailyPayMaps: (dailyPayMaps: Record<string, WorkDayMap>) => void;
  removeDay: (dateKey: string) => void;
  reset: () => void;
}

const now = new Date();

export const initialGlobalState: GlobalState = {
  config: {
    standardHours: 6.67,
    baseRate: 0,
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  },
  dailyPayMaps: {},
};

const resetMonthData = () => ({ dailyPayMaps: {} });

export const useGlobalStore = create<GlobalStore>((set) => ({
  ...initialGlobalState,
  updateYear: (year) =>
    set((state) => ({
      config: { ...state.config, year },
      ...resetMonthData(),
    })),
  updateMonth: (month) =>
    set((state) => ({
      config: { ...state.config, month },
      ...resetMonthData(),
    })),
  updateStandardHours: (standardHours) =>
    set((state) => ({ config: { ...state.config, standardHours } })),
  updateBaseRate: (baseRate) =>
    set((state) => ({ config: { ...state.config, baseRate } })),
  updateDayPayMap: (dateKey, dayPayMap) =>
    set((state) => ({
      dailyPayMaps: { ...state.dailyPayMaps, [dateKey]: dayPayMap },
    })),
  replaceDailyPayMaps: (dailyPayMaps) => set({ dailyPayMaps }),
  removeDay: (dateKey) =>
    set((state) => {
      const dailyPayMaps = { ...state.dailyPayMaps };
      delete dailyPayMaps[dateKey];
      return { dailyPayMaps };
    }),
  reset: () => set(resetMonthData()),
}));
