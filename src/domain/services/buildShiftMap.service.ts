import { DayShift, ExtraBreakdown, LabeledSegmentRange, PerDiemInfo, RegularBreakdown, Shift, SpecialBreakdown, WorkDayMapByShift, WorkDayMeta } from "../types/types";
import {
  fieldShiftPercent as defaultFieldShiftPercent,
  WorkDayType,
} from "@/constants";
import { shiftResolver } from "./resolvers/shiftResolver.service";
import { distributeRegularHours } from "./distributeRegularHours.service";
import { createPerDiemService } from "./factories/perDiem.service";

export const buildShiftMap = ((resolver, fieldShiftPercent, distributor, perDiemService) => {
    const sumHours = (key: string, shiftRaw: LabeledSegmentRange[]) => 
        shiftRaw
            .filter(s => s.key === key)
            .reduce(
                (acc, s) => acc + (s.point.end - s.point.start) / 60, 
                0
            );

    const buildWorkDayShift = (
            shift: Shift, 
            meta: WorkDayMeta, 
            standardHours: number
        ): WorkDayMapByShift => {
        const totalHours = (shift.end.minutes - shift.start.minutes) / 60;

        const shiftRaw = resolver({ shift,  meta });

        const extra: ExtraBreakdown = {
            hours20: { percent: fieldShiftPercent.hours20, hours: sumHours("hours20", shiftRaw) },
            hours50: { percent: fieldShiftPercent.hours50, hours: sumHours("hours50", shiftRaw) },
        };

        const special: SpecialBreakdown = {
            shabbat150: { percent: fieldShiftPercent.hours150, hours: sumHours("shabbat150", shiftRaw) },
            shabbat200: { percent: fieldShiftPercent.hours200, hours: sumHours("shabbat200", shiftRaw) },
        };

        const specialHours = special.shabbat150.hours + special.shabbat200.hours;
        const regularHours = totalHours - specialHours;

        let regular: RegularBreakdown;
        const isSpecialDay = meta.typeDay === WorkDayType.SpecialFull;

        if(isSpecialDay) {
            regular = {
                hours100: { percent: fieldShiftPercent.hours100, hours: 0 },
                hours125: { percent: fieldShiftPercent.hours125, hours: 0 },
                hours150: { percent: fieldShiftPercent.hours150, hours: regularHours },
            };
        } else {
            regular = distributor.distributeByShift(regularHours, standardHours);
        }

        return {
            id: shift.id,
            regular,
            extra,
            special,
            totalHours,
        };
    }

    const buildDayShift = (
            shift: Shift, 
            meta: WorkDayMeta, 
            standardHours: number, 
            isFieldDutyShift: boolean, 
            rateA: number
        ): DayShift => {
        const breakdown = buildWorkDayShift(shift, meta, standardHours);

        const diemInfo: PerDiemInfo = perDiemService.calculateDailyPerDiem(
            isFieldDutyShift, breakdown.totalHours, rateA
        );

        return {
            id: shift.id,
            shift,
            breakdown,
            perDiemShift: {
                isFieldDutyDay: isFieldDutyShift,
                diemInfo,
            },
        };
    };

    return {
        buildWorkDayShift,
        buildDayShift,
    }
    
})(shiftResolver, defaultFieldShiftPercent, distributeRegularHours, createPerDiemService());