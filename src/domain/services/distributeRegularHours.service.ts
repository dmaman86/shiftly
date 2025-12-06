import { RegularBreakdown } from "../types/types";

import {
  fieldShiftPercent as defaultFieldShiftPercent,
} from "@/constants";

export const distributeRegularHours = ((fieldShiftPercent) => {
    const MID_TIER = 2; // 2 hours

    const distributeByShift = (totalHours: number, standardHours: number): RegularBreakdown => {
        let remaining = totalHours;

        const overflow150 = Math.max(remaining - (standardHours + MID_TIER), 0);
        remaining -= overflow150;

        const overflow125 = Math.max(remaining - standardHours, 0);
        remaining -= overflow125;

        const hours100 = Math.max(remaining, 0);

        return {
            hours100: { percent: fieldShiftPercent.hours100, hours: hours100 },
            hours125: { percent: fieldShiftPercent.hours125, hours: overflow125 },
            hours150: { percent: fieldShiftPercent.hours150, hours: overflow150 },
        };
    };

    const distributeByDay = (regular: RegularBreakdown, standardHours: number): RegularBreakdown => {
        if(regular.hours100.hours > standardHours) {
            const overflow100 = regular.hours100.hours - standardHours;
            regular.hours100.hours = standardHours;
            regular.hours125.hours += overflow100;
        }
        if(regular.hours125.hours > MID_TIER) {
            const overflow125 = regular.hours125.hours - MID_TIER;
            regular.hours125.hours = MID_TIER;
            regular.hours150.hours += overflow125;
        }
        return regular;
    };

    return {
        distributeByShift,
        distributeByDay,
    }

})(defaultFieldShiftPercent);