import { PerDiemInfo } from "../../types/types";

export const createPerDiemService = () => {

    const perDiemTimeline: Array<{ year: number, month: number, rateA: number }> = [
        // valid until 31/08/2024
        { year: 2000, month: 1, rateA: 33.9 },
        // from 01/09/2024
        { year: 2024, month: 9, rateA: 36.3 }
    ] as const;

    const getRateForDate = (year: number, month: number): number => {
        const applicable = perDiemTimeline
            .filter(entry => entry.year < year || (entry.year === year && entry.month <= month))
            .sort((a, b) => {
                if(a.year !== b.year) return b.year - a.year;
                return b.month - a.month;
            });

        return applicable.length > 0 ? applicable[0].rateA : 0;
    };

    const getTier = (totalDailyHours: number): { tier: "A" | "B" | "C" | null; points: number } => {
        if(totalDailyHours >= 12) return { tier: "C", points: 3 };
        if(totalDailyHours >= 8) return { tier: "B", points: 2 };
        if(totalDailyHours >= 4) return { tier: "A", points: 1 };
        return { tier: null, points: 0 };
    };

    const calculateDailyPerDiem = (
        isFieldDutyShift: boolean,
        totalHours: number,
        rate: number
    ): PerDiemInfo => {
        if(!isFieldDutyShift) {
            return { tier: null, points: 0, amount: 0 };
        }
        const { tier, points } = getTier(totalHours);

        return { tier, points, amount: rate * points };
    }

    return {
        calculateDailyPerDiem,
        getRateForDate,
        getTier,
    }

};