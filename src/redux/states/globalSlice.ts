import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { MonthPayMap, WorkDayMap } from "@/domain";
import { domain } from "@/context";

interface GlobalState {
  config: {
    standardHours: number;
    baseRate: number;
    year: number;
    month: number;
  };
  dailyPayMaps: Record<string, WorkDayMap>;
  globalBreakdown: MonthPayMap;
}

const { payMap } = domain;
const now = new Date();
const initialYear = now.getFullYear();
const initialMonth = now.getMonth() + 1;

const initialState: GlobalState = {
  config: {
    standardHours: 6.67,
    baseRate: 0,
    year: initialYear,
    month: initialMonth,
  },
  dailyPayMaps: {},
  globalBreakdown: payMap.monthPayMapCalculator.createEmpty(),
};

const resetMonthData = (state: GlobalState) => {
  state.globalBreakdown = payMap.monthPayMapCalculator.createEmpty();
  state.dailyPayMaps = {};
};

export const globalSlice = createSlice({
  name: "global",
  initialState,
  reducers: {
    setYear: (state, action: PayloadAction<number>) => {
      state.config.year = action.payload;
      if (state.config.month > 12) state.config.month = 1;
      resetMonthData(state);
    },
    setMonth: (state, action: PayloadAction<number>) => {
      state.config.month = action.payload;
      resetMonthData(state);
    },
    setStandardHours: (state, action: PayloadAction<number>) => {
      state.config.standardHours = action.payload;
    },

    setBaseRate: (state, action: PayloadAction<number>) => {
      state.config.baseRate = action.payload;
    },

    addDayPayMap: (
      state,
      action: PayloadAction<{ dateKey: string; dayPayMap: WorkDayMap }>,
    ) => {
      const { dateKey, dayPayMap } = action.payload;
      const prev = state.dailyPayMaps[dateKey];

      if (prev) {
        state.globalBreakdown = payMap.monthPayMapCalculator.subtract(
          state.globalBreakdown,
          prev,
        );
      }

      state.globalBreakdown = payMap.monthPayMapCalculator.accumulate(
        state.globalBreakdown,
        dayPayMap,
      );

      state.dailyPayMaps[dateKey] = dayPayMap;
    },

    removeDayPayMap: (state, action: PayloadAction<string>) => {
      const dateKey = action.payload;
      const prev = state.dailyPayMaps[dateKey];

      if (!prev) return;

      state.globalBreakdown = payMap.monthPayMapCalculator.subtract(
        state.globalBreakdown,
        prev,
      );
      delete state.dailyPayMaps[dateKey];
    },

    resetGlobal: (state) => {
      resetMonthData(state);
    },
  },
});

export const {
  setYear,
  setMonth,
  setStandardHours,
  setBaseRate,
  addDayPayMap,
  removeDayPayMap,
  resetGlobal,
} = globalSlice.actions;
export default globalSlice.reducer;
