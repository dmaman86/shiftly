import type { PerDiemCalculator } from "../../types/services.js";
import type { PerDiemShiftInfo } from "../../types/types.js";

const TIER_C_MIN_HOURS = 12;
const TIER_B_MIN_HOURS = 8;
const TIER_A_MIN_HOURS = 4;

export class TimelinePerDiemCalculator implements PerDiemCalculator {
  private readonly timeline = [
    // Provisional historical dates: verify against the authoritative source.
    { year: 2015, month: 11, rateA: 29.5 },
    { year: 2021, month: 1, rateA: 31.6 },
    // Verified effective dates.
    { year: 2022, month: 10, rateA: 33.9 },
    { year: 2024, month: 9, rateA: 36.3 },
  ];

  calculateRate(params: { year: number; month: number }): number {
    const { year, month } = params;
    const applicable = this.timeline
      .filter(
        (entry) =>
          entry.year < year || (entry.year === year && entry.month <= month),
      )
      .sort((a, b) =>
        a.year !== b.year ? b.year - a.year : b.month - a.month,
      );

    return applicable[0]?.rateA ?? 0;
  }

  calculateDay(params: { shifts: PerDiemShiftInfo[]; rate: number }) {
    const isFieldDutyDay = params.shifts.some(
      (shift) => shift.isFieldDutyShift,
    );

    const totalHours = params.shifts
      .filter((shift) => shift.isFieldDutyShift)
      .reduce((sum, shift) => sum + shift.hours, 0);

    if (!isFieldDutyDay) {
      return {
        isFieldDutyDay: false,
        diemInfo: { tier: null, points: 0, amount: 0 },
      };
    }

    const { tier, points } = this.getTier(totalHours);

    return {
      isFieldDutyDay: true,
      diemInfo: {
        tier,
        points,
        amount: params.rate * points,
      },
    };
  }

  private getTier(totalHours: number): {
    tier: "A" | "B" | "C" | null;
    points: number;
  } {
    if (totalHours >= TIER_C_MIN_HOURS) {
      return { tier: "C", points: 3 };
    }
    if (totalHours >= TIER_B_MIN_HOURS) {
      return { tier: "B", points: 2 };
    }
    if (totalHours >= TIER_A_MIN_HOURS) {
      return { tier: "A", points: 1 };
    }
    return { tier: null, points: 0 };
  }
}
