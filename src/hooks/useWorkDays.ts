import { useDispatch, useSelector } from "react-redux";

import { AppDispatch, RootState } from "@/redux/store";
import { setWorkDays } from "@/redux/states/workDaysSlice";
import { WorkDayType } from "@/constants";

export const useWorkDays = () => {
  const dispatch = useDispatch<AppDispatch>();

  // core array of WorkDayInfo
  const workDays = useSelector((state: RootState) => state.workDays.workDays);

  const generate = (
    year: number,
    month: number,
    eventMap: Record<string, string[]>,
  ) => {
    dispatch(setWorkDays({ year, month, eventMap }));
  };

  const getDayInfo = (date: string) =>
    workDays.find((d) => d.meta.date === date);

  const isSpecialFullDay = (date: string) => {
    const day = getDayInfo(date);
    return day ? day.meta.typeDay === WorkDayType.SpecialFull : false;
  };

  const isPartialHolidayDay = (date: string) => {
    const day = getDayInfo(date);
    return day ? day.meta.typeDay === WorkDayType.SpecialPartialStart : false;
  };

  const isCrossDaySpecial = (date: string) => {
    const day = getDayInfo(date);
    return day ? day.meta.crossDayContinuation === true : false;
  };

  return {
    workDays,
    generate,
    getDayInfo,
    isSpecialFullDay,
    isPartialHolidayDay,
    isCrossDaySpecial,
  };
};
