import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { WorkDayInfo, WorkDaysState } from '@/domain';
import { domain } from '@/context/domain.singleton';
import { WorkDayType } from '@/constants';
import { DateUtils } from '@/utils';

const initialState: WorkDaysState = {
    year: null,
    month: null,
    workDays: [],
};

const { resolvers } = domain;
const holidayResolver = resolvers.holidayResolver;
const { formatDate, getDaysInMonth, getHebrewDayLetter, getNextMonthDay } = DateUtils();

const generateWorkDays = (
    year: number,
    month: number,
    eventMap: Record<string, string[]>,
  ): WorkDayInfo[] => {
    const daysInMonth = getDaysInMonth(year, month);
    const days: WorkDayInfo[] = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const currentDate = new Date(year, month - 1, day);
      const formattedDate = formatDate(currentDate);
      const weekday = currentDate.getDay();
      const hebrewDay = getHebrewDayLetter(currentDate);
      const eventTitles = eventMap[formattedDate] || [];

      const currentType = holidayResolver.resolve(weekday, eventTitles);

      const row: WorkDayInfo = {
        meta: {
          date: formattedDate,
          typeDay: currentType,
          crossDayContinuation: false,
        },
        hebrewDay,
      };

      days[day - 1] = row;

      if (day > 1) {
        days[day - 2].meta.crossDayContinuation =
          currentType === WorkDayType.SpecialFull;
      }
    }
    return days;
  };

export const workDaysSlice = createSlice({
    name: 'workDays',
    initialState,
    reducers: {
        buildWorkDays: (
            state,
            actions: PayloadAction<{ year: number; month: number; eventMap: Record<string, string[]>; }>
        ) => {
            const { year, month, eventMap } = actions.payload;
            state.year = year;
            state.month = month;

            const days: WorkDayInfo[] = generateWorkDays(
                year,
                month,
                eventMap,
            );
            const nextMonthDay = getNextMonthDay(year, month);
            const nextDayEvents = eventMap[formatDate(nextMonthDay)] || [];
            const nextDayType = holidayResolver.resolve(
                nextMonthDay.getDay(),
                nextDayEvents,
            );
            days[days.length - 1].meta.crossDayContinuation =
                nextDayType === WorkDayType.SpecialFull;

            state.workDays = days;
        },
    },
});

export const { buildWorkDays } = workDaysSlice.actions;
export default workDaysSlice.reducer;

