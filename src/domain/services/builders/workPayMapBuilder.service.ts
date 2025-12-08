import { createGenericBreakdownFactory } from "../factories/genericBreakdown.service";
import { createRegularService } from "../factories/regular.service";

import { DayShift, WorkPayMap } from "../../types/types";
import { createPerDiemService } from "../factories/perDiem.service";


export const createWorkPayMapBuilderService = (
    fieldShiftPercent: Record<string, number>,
    regularService: ReturnType<typeof createRegularService>,
    genericBreakdownFactory: typeof createGenericBreakdownFactory,
    perDiemService: ReturnType<typeof createPerDiemService>,
) => {

    // ---- configs + breakdown services ----
    const extraService = genericBreakdownFactory({
        hours20: fieldShiftPercent.hours20,
        hours50: fieldShiftPercent.hours50,
    });

    const specialService = genericBreakdownFactory({
        shabbat150: fieldShiftPercent.hours150,
        shabbat200: fieldShiftPercent.hours200,
    });

    const sickService = genericBreakdownFactory({
        hours100: fieldShiftPercent.hours100,
    });

    const vacationService = genericBreakdownFactory({
        hours100: fieldShiftPercent.hours100,
    });

    const extra100ShabbatService = genericBreakdownFactory({
        hours100: fieldShiftPercent.hours100,
    });

    const initState = (baseRate: number, rateDiem: number, prev?: WorkPayMap) => ({
        regular: regularService.createBreakdown(prev?.regular),
        extra: extraService.init(prev?.extra),
        special: specialService.init(prev?.special),
        hours100Sick: prev?.hours100Sick ?? sickService.init().hours100,
        hours100Vacation: prev?.hours100Vacation ?? vacationService.init().hours100,
        extra100Shabbat: prev?.extra100Shabbat ?? extra100ShabbatService.init().hours100,
        totalHours: prev?.totalHours ?? 0,
        baseRate,
        rateDiem,
        perDiem: prev?.perDiem ?? { isFieldDutyDay: false, diemInfo: { tier: null, points: 0, amount: 0 } },
    });

    const recalculateDay = (day: WorkPayMap, standardHours: number, baseRate: number): WorkPayMap => {
        const regular = regularService.distributeByDay(day.regular, standardHours);

        return {
            ...day,
            regular,
            baseRate,
        }
    }

    const buildFromShifts = (shifts: DayShift[], standardHours: number, baseRate: number, rateDiem: number): WorkPayMap => {
        const builder = create(baseRate, rateDiem);

        shifts.forEach(shift => {
            builder.addShift(shift, standardHours);
        });
        return builder.build();
    }

    const create = (baseRate: number, rateDiem: number) => {
        let state = initState(baseRate, rateDiem);

        const addShift = (shift: DayShift, standardHours: number) => {
            const { breakdown, perDiemShift } = shift;

            let regular = regularService.accumulate(state.regular, breakdown.regular);
            regular = regularService.distributeByDay(regular, standardHours);

            const extra = extraService.accumulateTwo(state.extra, breakdown.extra);
            const special = specialService.accumulateTwo(state.special, breakdown.special);

            const extra100Shabbat = {
                percent: state.extra100Shabbat.percent,
                hours: state.extra100Shabbat.hours + 
                        breakdown.special.shabbat200.hours + 
                        breakdown.special.shabbat150.hours,
            }

            const isFieldDutyDay = state.perDiem.isFieldDutyDay || perDiemShift.isFieldDutyDay;
            
            const totalHours = state.totalHours + (perDiemShift.isFieldDutyDay ? breakdown.totalHours : 0);
            const diemInfo = perDiemService.calculateDailyPerDiem(
                isFieldDutyDay,
                totalHours,
                state.rateDiem
            );

            state = {
                ...state,
                regular,
                extra,
                special,
                extra100Shabbat,
                totalHours: state.totalHours + breakdown.totalHours,
                perDiem: {
                    isFieldDutyDay,
                    diemInfo,
                },
            };
            
            return builder;
        };

        const addDay = (day: WorkPayMap) => {
            state = {
                regular: regularService.accumulate(state.regular, day.regular),
                extra: extraService.accumulateTwo(state.extra, day.extra),
                special: specialService.accumulateTwo(state.special, day.special),
                hours100Sick: {
                    percent: state.hours100Sick.percent,
                    hours: state.hours100Sick.hours + day.hours100Sick.hours,
                },
                hours100Vacation: {
                    percent: state.hours100Vacation.percent,
                    hours: state.hours100Vacation.hours + day.hours100Vacation.hours,
                },
                extra100Shabbat: {
                    percent: state.extra100Shabbat.percent,
                    hours: state.extra100Shabbat.hours + day.extra100Shabbat.hours,
                },
                totalHours: state.totalHours + day.totalHours,
                baseRate: state.baseRate,
                rateDiem: state.rateDiem,
                perDiem: {
                    isFieldDutyDay: false,
                    diemInfo: {
                        tier: null,
                        points: state.perDiem.diemInfo.points + day.perDiem.diemInfo.points,
                        amount: state.perDiem.diemInfo.amount + day.perDiem.diemInfo.amount,
                    },
                },
            };
            return builder;
        };

        const updateBaseRate = (newBaseRate: number) => {
            state.baseRate = newBaseRate;
            return builder;
        };

        const build = () => state;

        const builder = {
            addShift,
            addDay,
            updateBaseRate,
            build,
        }
        return builder;
    };

    return { create, recalculateDay, buildFromShifts };
}