import { PerDiemInfo } from "../types/types";

export const PerDiemService = (() => {

    const perDiemTimeline: Array<{ year: number, month: number, rateA: number }> = [
        // valid until 31/08/2024
        { year: 2000, month: 1, rateA: 33.9 },
        // from 01/09/2024
        { year: 2024, month: 9, rateA: 36.3 }
    ];

    const getRateForDate = (year: number, month: number): number => {
        const applicable = perDiemTimeline
            .filter(entry => entry.year < year || (entry.year === year && entry.month <= month))
            .sort((a, b) => {
                if(a.year !== b.year) return b.year - a.year;
                return b.month - a.month;
            });

        return applicable.length > 0 ? applicable[0].rateA : 0;
    };

    const getTier = (totalDailyHours: number): "A" | "B" | "C" | null => {
        if(totalDailyHours >= 12) return "C";
        if(totalDailyHours >= 8) return "B";
        if(totalDailyHours >= 4) return "A";
        return null;
    };

    const getPointsForTier = (tier: "A" | "B" | "C" | null): number => {
        if(tier === "A") return 1;
        if(tier === "B") return 2;
        if(tier === "C") return 3;
        return 0;
    };

    // -------------------------------------
    // MAIN LOGIC (DAILY PER-DIEM — אש״ל יומי)
    // -------------------------------------

    /**
     * Calculates daily Per-Diem ("אש״ל") based on:
     * - workDayDate       → determines which rate applies
     * - isFieldDutyDay    → whether the whole day is considered "on duty"
     * - totalDailyHours   → sum of all shift hours in that day
     *
     * Returns:
     * {
     *   tier: "A" | "B" | "C" | null,
     *   points: number,
     *   amount: number
     * }
     */

    const calculateDailyPerDiem = (
        isFieldDutyShift: boolean,
        totalHours: number,
        rate: number
    ): PerDiemInfo => {
        if(!isFieldDutyShift) {
            return { tier: null, points: 0, amount: 0 };
        }
        const tier = getTier(totalHours);
        if(!tier) {
            return { tier: null, points: 0, amount: 0 };
        }

        const points = getPointsForTier(tier);

        return { tier, points, amount: rate * points };
    }

    return {
        calculateDailyPerDiem,
        getRateForDate,
        getTier,
        getPointsForTier
    }

})();