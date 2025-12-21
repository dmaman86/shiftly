import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { WorkDayInfo } from "@/domain";
import { domain } from "@/context";

type WorkDaysState = {
  year: number | null;
  month: number | null;
  workDays: WorkDayInfo[];
};

const initialState: WorkDaysState = {
  year: null,
  month: null,
  workDays: [],
};

const { payMap } = domain;

export const workDaysSlice = createSlice({
  name: "workDays",
  initialState,
  reducers: {
    setWorkDays: (
      state,
      actions: PayloadAction<{
        year: number;
        month: number;
        eventMap: Record<string, string[]>;
      }>,
    ) => {
      const { year, month, eventMap } = actions.payload;
      state.year = year;
      state.month = month;

      state.workDays = payMap.workDaysMonthBuilder.build({
        year,
        month,
        eventMap,
      });
    },
  },
});

export const { setWorkDays } = workDaysSlice.actions;
export default workDaysSlice.reducer;
