import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/redux/store";

import {
  setYear,
  setMonth,
  setStandardHours,
  setBaseRate,
  addDayPayMap,
  removeDayPayMap,
  resetGlobal,
} from "@/redux/states/globalSlice";
import { WorkDayMap } from "@/domain";

export const useGlobalState = () => {
  const dispatch = useDispatch<AppDispatch>();

  // === SELECTORS ===
  const year = useSelector((state: RootState) => state.global.config.year);
  const month = useSelector((state: RootState) => state.global.config.month);
  const standardHours = useSelector(
    (state: RootState) => state.global.config.standardHours,
  );
  const baseRate = useSelector(
    (state: RootState) => state.global.config.baseRate,
  );

  const globalBreakdown = useSelector(
    (state: RootState) => state.global.globalBreakdown,
  );

  const dailyPayMaps = useSelector(
    (state: RootState) => state.global.dailyPayMaps,
  );

  const updateYear = (year: number) => {
    dispatch(setYear(year));
  };

  const updateMonth = (month: number) => {
    dispatch(setMonth(month));
  };

  const updateStandardHours = (hours: number) => {
    dispatch(setStandardHours(hours));
  };

  const updateBaseRate = (rate: number) => {
    dispatch(setBaseRate(rate));
  };

  const addDay = (dateKey: string, dayPayMap: WorkDayMap) => {
    dispatch(addDayPayMap({ dateKey, dayPayMap }));
  };

  const removeDay = (dateKey: string) => {
    dispatch(removeDayPayMap(dateKey));
  };

  const reset = () => {
    dispatch(resetGlobal());
  };

  return {
    // state
    year,
    month,
    standardHours,
    baseRate,
    globalBreakdown,
    dailyPayMaps,

    // actions
    updateYear,
    updateMonth,
    updateStandardHours,
    updateBaseRate,
    addDay,
    removeDay,
    reset,
  };
};
