import { PerDiemDayCalculator, PerDiemShiftInfo } from "@/domain";

export class DefaultPerDiemDayCalculator implements PerDiemDayCalculator {
  private getTier(totalHours: number): {
    tier: "A" | "B" | "C" | null;
    points: number;
  } {
    if (totalHours >= 12) return { tier: "C", points: 3 };
    if (totalHours >= 8) return { tier: "B", points: 2 };
    if (totalHours >= 4) return { tier: "A", points: 1 };
    return { tier: null, points: 0 };
  }

  calculate(params: { shifts: PerDiemShiftInfo[]; rate: number }) {
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
}
