import { createGenericBreakdownFactory, createPerDiemService, createRegularService, createShiftResolverService } from "../..";
import { DayShift, ExtraBreakdown, Shift, SpecialBreakdown, WorkDayMapByShift, WorkDayMeta, LabeledSegmentRange } from "../../types/types";


export const createShiftMapBuilderService = (
    resolver: ReturnType<ReturnType<typeof createShiftResolverService>["build"]>,
    fieldShiftPercent: Record<string, number>,
    regularService: ReturnType<typeof createRegularService>,
    genericBreakdownFactory: typeof createGenericBreakdownFactory,
    perDiemService: ReturnType<typeof createPerDiemService>,
) => {

    const extraPercent = {
        hours20: fieldShiftPercent.hours20,
        hours50: fieldShiftPercent.hours50,
    };

    const specialPercent = {
        shabbat150: fieldShiftPercent.hours150,
        shabbat200: fieldShiftPercent.hours200,
    };

    const create = (meta: WorkDayMeta, standardHours: number, defaultRate: number) => {
        const extraService = genericBreakdownFactory(extraPercent);
        const specialService = genericBreakdownFactory(specialPercent);

        let currentShift: Shift | null = null;
        let currentBreakdown: WorkDayMapByShift | null = null;

        const withShift = (shift: Shift) => {
            currentShift = shift;
            const totalHours = (shift.end.minutes - shift.start.minutes) / 60;

            const shiftRaw: LabeledSegmentRange[] = resolver.resolve(shift, meta);

            const extraBase = extraService.init();
            const extra = extraService.accumulate(extraBase, shiftRaw);
            const specialBase = specialService.init();
            const special = specialService.accumulate(specialBase, shiftRaw);

            const specialHours = special.shabbat150.hours + special.shabbat200.hours;
            const regularHours = totalHours - specialHours;

            const regular = regularService.calculate(regularHours, standardHours, meta);

            currentBreakdown = {
                id: shift.id,
                regular,
                extra: extra as ExtraBreakdown,
                special: special as SpecialBreakdown,
                totalHours,
            };

            return builder;
        };

        const buildWorkDayShift = (): WorkDayMapByShift => {
            if (!currentShift || !currentBreakdown) 
                throw new Error("Shift must be provided before building WorkDayMapByShift");

            return currentBreakdown;
        };

        const buildDayShift = (isFieldDutyShift: boolean, rate: number = defaultRate): DayShift => {
            if (!currentShift || !currentBreakdown)
                throw new Error("Shift must be provided before building DayShift");

            const diemInfo = perDiemService.calculateDailyPerDiem(
                isFieldDutyShift,
                currentBreakdown.totalHours,
                rate
            );

            return {
                id: currentShift.id,
                shift: currentShift,
                breakdown: currentBreakdown,
                perDiemShift: {
                    isFieldDutyDay: isFieldDutyShift,
                    diemInfo,
                },
            };
        };

        const builder = {
            withShift,
            buildWorkDayShift,
            buildDayShift,
        };

        return builder;
    };

    return { create };
};