import { useDispatch, useSelector } from "react-redux";
import { RootState, AppDispatch } from "@/redux/store";

import {
    setYear,
    setMonth,
    setStandardHours,
    setBaseRate,
    updateDayBreakdown,
    updateBreakdown,
    resetGlobal
} from "@/redux/states/globalSlice";
import { WorkPayMap } from "@/domain";

export const useGlobalState = () => {

    const dispatch = useDispatch<AppDispatch>();

    // === SELECTORS ===
    const year = useSelector((state: RootState) => state.global.year);
    const month = useSelector((state: RootState) => state.global.month);
    const standardHours = useSelector((state: RootState) => state.global.standardHours);
    const baseRate = useSelector((state: RootState) => state.global.baseRate);

    const dailyBreakdowns = useSelector((state: RootState) => state.global.dailyBreakdowns);
    const globalBreakdown = useSelector((state: RootState) => state.global.globalBreakdown);

    const updateYear = (year: number) => {
        dispatch(setYear(year));
    }

    const updateMonth = (month: number) => {
        dispatch(setMonth(month));
    }

    const updateStandardHours = (hours: number) => {
        dispatch(setStandardHours(hours));
    }

    const updateBaseRate = (rate: number) => {
        dispatch(setBaseRate(rate));
    }

    const updateBreakdownForDay = (date: string, map: WorkPayMap) => {
        dispatch(updateDayBreakdown({ date, map }));
    }

    const updateGlobalBreakdown = (map: WorkPayMap) => {
        dispatch(updateBreakdown(map));
    }

    const reset = () => dispatch(resetGlobal());

    return {
        // state
        year,
        month,
        standardHours,
        baseRate,
        dailyBreakdowns,
        globalBreakdown,


        // actions
        updateYear,
        updateMonth,
        updateStandardHours,
        updateBaseRate,
        updateBreakdownForDay,
        updateGlobalBreakdown,
        reset,
    }
};