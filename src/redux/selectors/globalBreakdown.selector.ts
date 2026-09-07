import { createSelector } from "@reduxjs/toolkit";
import type { MonthPayMapReducer } from "@/domain";
import type { RootState } from "@/redux/store";

const selectDailyPayMaps = (state: RootState) => state.global.dailyPayMaps;

export const createSelectGlobalBreakdown = (
  monthPayMapCalculator: MonthPayMapReducer,
) =>
  createSelector([selectDailyPayMaps], (dailyPayMaps) =>
    Object.values(dailyPayMaps).reduce(
      (breakdown, dayPayMap) =>
        monthPayMapCalculator.accumulate(breakdown, dayPayMap),
      monthPayMapCalculator.createEmpty(),
    ),
  );
