import type { PerDiemCalculator } from "../../types/services";
import type { PerDiemShiftInfo } from "../../types/types";

export class TimelinePerDiemCalculator implements PerDiemCalculator {
  private readonly timeline = [
    { year: 2000, month: 1, rateA: 33.9 },
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
    if (totalHours >= 12) return { tier: "C", points: 3 };
    if (totalHours >= 8) return { tier: "B", points: 2 };
    if (totalHours >= 4) return { tier: "A", points: 1 };
    return { tier: null, points: 0 };
  }
}
