import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { WorkDayInfo, resolveHolidayType, WorkDaysState } from '@/domain';
import { WorkDayType } from '@/constants';
import { DateUtils } from '@/utils';

const initialState: WorkDaysState = {
    year: null,
    month: null,
    workDays: [],
};

export const workDaysSlice = createSlice({
    name: 'workDays',
    initialState,
    reducers: {
        generateWorkDays: (
            state,
            actions: PayloadAction<{ year: number; month: number; eventMap: Record<string, string[]>; }>
        ) => {
            const { year, month, eventMap } = actions.payload;
            state.year = year;
            state.month = month;

            const days: WorkDayInfo[] = DateUtils.generateWorkDays(
                year,
                month,
                eventMap,
            );
            const nextMonthDay = DateUtils.getNextMonthDay(year, month);
            const nextDayEvents = eventMap[DateUtils.formatDate(nextMonthDay)] || [];
            const nextDayType = resolveHolidayType(
                nextMonthDay.getDay(),
                nextDayEvents,
            );
            days[days.length - 1].meta.crossDayContinuation =
                nextDayType === WorkDayType.SpecialFull;

            state.workDays = days;
        },
    },
});

export const { generateWorkDays } = workDaysSlice.actions;
export default workDaysSlice.reducer;

