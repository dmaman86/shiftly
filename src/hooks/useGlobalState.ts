import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/redux/store";

import {
  setYear,
  setMonth,
  setStandardHours,
  setBaseRate,
  setDayPayMap,
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

  const updateYear = useCallback(
    (year: number) => {
      dispatch(setYear(year));
    },
    [dispatch],
  );

  const updateMonth = useCallback(
    (month: number) => {
      dispatch(setMonth(month));
    },
    [dispatch],
  );

  const updateStandardHours = useCallback(
    (hours: number) => {
      dispatch(setStandardHours(hours));
    },
    [dispatch],
  );

  const updateBaseRate = useCallback(
    (rate: number) => {
      dispatch(setBaseRate(rate));
    },
    [dispatch],
  );

  const updateDayPayMap = useCallback(
    (dateKey: string, dayPayMap: WorkDayMap) => {
      dispatch(setDayPayMap({ dateKey, dayPayMap }));
    },
    [dispatch],
  );

  const removeDay = useCallback(
    (dateKey: string) => {
      dispatch(removeDayPayMap(dateKey));
    },
    [dispatch],
  );

  const reset = useCallback(() => {
    dispatch(resetGlobal());
  }, [dispatch]);

  return {
    // state
    year,
    month,
    standardHours,
    baseRate,
    // actions
    updateYear,
    updateMonth,
    updateStandardHours,
    updateBaseRate,
    updateDayPayMap,
    removeDay,
    reset,
  };
};
