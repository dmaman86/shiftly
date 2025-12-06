import { WorkPayMap, workPayMapService, PerDiemService } from "@/domain";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface GlobalState {
    year: number;
    month: number;
    standardHours: number;
    baseRate: number;
    rateDiem: number;
    dailyBreakdowns: Record<string, WorkPayMap>;
    globalBreakdown: WorkPayMap;
}

const now = new Date();
const initialYear = now.getFullYear();
const initialMonth = now.getMonth() + 1;

const initialRateDiem = PerDiemService.getRateForDate(initialYear, initialMonth);

const initialState: GlobalState = {
    year: initialYear,
    month: initialMonth,
    standardHours: 6.67,
    baseRate: 0,
    rateDiem: initialRateDiem,
    dailyBreakdowns: {},
    globalBreakdown: workPayMapService.init(0, initialRateDiem),
};

const recalcAllDays = (
  daily: Record<string, WorkPayMap>, 
  standardHours: number, 
  baseRate: number
): Record<string, WorkPayMap> => {
  const updated: Record<string, WorkPayMap> = {};

  Object.entries(daily).forEach(([dateKey, map]) => {

    updated[dateKey] = workPayMapService.recalculateDay(
      map, 
      standardHours, 
      baseRate, 
    );
  });
  
  return updated;
};

const recalcGlobal = (daily: Record<string, WorkPayMap>, baseRate: number, rateDiem: number): WorkPayMap => {
  return Object.values(daily).reduce(
    (acc, d) => workPayMapService.accumulateDaily(acc, d),
    workPayMapService.init(baseRate, rateDiem)
  );
};

const resetMonthData = (state: GlobalState) => {
  state.dailyBreakdowns = {};
  state.globalBreakdown = workPayMapService.init(state.baseRate, state.rateDiem);
};

export const globalSlice = createSlice({
  name: "global",
  initialState,
  reducers: {
    setYear: (state, action: PayloadAction<number>) => {
      state.year = action.payload;

      // reset month to 1 if needed
      if (state.month > 12) state.month = 1;
      state.rateDiem = PerDiemService.getRateForDate(state.year, state.month);

      resetMonthData(state);
    },

    setMonth: (state, action: PayloadAction<number>) => {
      state.month = action.payload;
      state.rateDiem = PerDiemService.getRateForDate(state.year, state.month);

      resetMonthData(state);
    },

    setStandardHours: (state, action: PayloadAction<number>) => {
      state.standardHours = action.payload;

      state.dailyBreakdowns = recalcAllDays(state.dailyBreakdowns, state.standardHours, state.baseRate);
      state.globalBreakdown = recalcGlobal(state.dailyBreakdowns, state.baseRate, state.rateDiem);
    },

    setBaseRate: (state, action: PayloadAction<number>) => {
      state.baseRate = action.payload;

      state.dailyBreakdowns = recalcAllDays(state.dailyBreakdowns, state.standardHours, state.baseRate);
      state.globalBreakdown = recalcGlobal(state.dailyBreakdowns, state.baseRate, state.rateDiem);
    },

    updateDayBreakdown: (
      state,
      action: PayloadAction<{ date: string; map: WorkPayMap }>
    ) => {
      const { date, map } = action.payload;

      state.dailyBreakdowns[date] = {
        ...map,
        baseRate: state.baseRate,
        perDiem: {
          ...map.perDiem,
          isFieldDutyDay: map.perDiem.isFieldDutyDay,
        }
      };

      state.globalBreakdown = recalcGlobal(state.dailyBreakdowns, state.baseRate, state.rateDiem);
    },

    updateBreakdown: (state, action: PayloadAction<WorkPayMap>) => {
        state.globalBreakdown = action.payload;
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
    updateDayBreakdown,
    updateBreakdown,
    resetGlobal,
} = globalSlice.actions;
export default globalSlice.reducer;