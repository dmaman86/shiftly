import { createSlice, PayloadAction } from "@reduxjs/toolkit";

import { WorkDayMap } from "@/domain";

export interface GlobalState {
  config: {
    standardHours: number;
    baseRate: number;
    year: number;
    month: number;
  };
  dailyPayMaps: Record<string, WorkDayMap>;
}

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
};

const resetMonthData = (state: GlobalState) => {
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

    setDayPayMap: (
      state,
      action: PayloadAction<{ dateKey: string; dayPayMap: WorkDayMap }>,
    ) => {
      const { dateKey, dayPayMap } = action.payload;
      state.dailyPayMaps[dateKey] = dayPayMap;
    },

    removeDayPayMap: (state, action: PayloadAction<string>) => {
      const dateKey = action.payload;
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
  setDayPayMap,
  removeDayPayMap,
  resetGlobal,
} = globalSlice.actions;
export default globalSlice.reducer;
