import { WorkDayType } from "@/constants";
import { RegularBreakdown, WorkDayMeta } from "../../types/types";


export const createRegularService = (fieldShiftPercent: Record<string, number>) => {

    const MID_TIER = 2; // 2 hours

    const createBreakdown = (prev?: RegularBreakdown): RegularBreakdown => ({
        hours100: { percent: fieldShiftPercent.hours100, hours: prev?.hours100.hours ?? 0 },
        hours125: { percent: fieldShiftPercent.hours125, hours: prev?.hours125.hours ?? 0 },
        hours150: { percent: fieldShiftPercent.hours150, hours: prev?.hours150.hours ?? 0 },
    });

    const distributeByShift = (
        totalHours: number,
        standardHours: number
    ): RegularBreakdown => {

        let remaining = totalHours;

        const overflow150 = Math.max(remaining - (standardHours + MID_TIER), 0);
        remaining -= overflow150;

        const overflow125 = Math.max(remaining - standardHours, 0);
        remaining -= overflow125;

        const hours100 = Math.max(remaining, 0);

        return {
            hours100: { hours: hours100, percent: fieldShiftPercent.hours100 },
            hours125: { hours: overflow125, percent: fieldShiftPercent.hours125 },
            hours150: { hours: overflow150, percent: fieldShiftPercent.hours150 },
        };
    };

    const distributeByDay = (
        r: RegularBreakdown,
        standardHours: number
    ): RegularBreakdown => {

        const adj100 = Math.min(r.hours100.hours, standardHours);
        const overflow100 = r.hours100.hours - adj100;

        const adj125 = Math.min(r.hours125.hours + overflow100, MID_TIER);
        const overflow125 = (r.hours125.hours + overflow100) - adj125;

        const adj150 = r.hours150.hours + overflow125;

        return {
            hours100: { hours: adj100, percent: r.hours100.percent },
            hours125: { hours: adj125, percent: r.hours125.percent },
            hours150: { hours: adj150, percent: r.hours150.percent },
        };
    };

    const accumulate = (base: RegularBreakdown, add: RegularBreakdown): RegularBreakdown => {
        return {
            hours100: {
                percent: base.hours100.percent,
                hours: base.hours100.hours + add.hours100.hours,
            },
            hours125: {
                percent: base.hours125.percent,
                hours: base.hours125.hours + add.hours125.hours,
            },
            hours150: {
                percent: base.hours150.percent,
                hours: base.hours150.hours + add.hours150.hours,
            },
        };
    };

    const handleSpecialFull = (regularHours: number): RegularBreakdown => ({
        hours100: { percent: fieldShiftPercent.hours100, hours: 0 },
        hours125: { percent: fieldShiftPercent.hours125, hours: 0 },
        hours150: { percent: fieldShiftPercent.hours150, hours: regularHours },
    });

    const calculate = (totalHours: number, standardHours: number, meta: WorkDayMeta): RegularBreakdown => {
        const isSpecialDay = meta.typeDay === WorkDayType.SpecialFull;

        if(isSpecialDay) return handleSpecialFull(totalHours);

        return distributeByShift(totalHours, standardHours);
    }

    return {
        createBreakdown,
        distributeByShift,
        distributeByDay,
        calculate,
        accumulate,
    }

};