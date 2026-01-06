import type { PerDiemShiftCalculator } from "@/domain/types/services";
import type { PerDiemShiftInfo } from "@/domain/types/types";
import type { Shift } from "@/domain/types/data-shapes";

export class DefaultPerDiemShiftCalculator implements PerDiemShiftCalculator {
  createEmpty(): PerDiemShiftInfo {
    return {
      isFieldDutyShift: false,
      hours: 0,
    };
  }

  calculate(params: {
    shift: Shift;
    isFieldDutyShift: boolean;
  }): PerDiemShiftInfo {
    const { shift, isFieldDutyShift } = params;
    const endMinutes = this.getMinutesFromMidnight(shift.end.date);
    const startMinutes = this.getMinutesFromMidnight(shift.start.date);

    const hours = (endMinutes - startMinutes) / 60;
    return {
      isFieldDutyShift,
      hours,
    };
  }

  private getMinutesFromMidnight(date: Date): number {
    return date.getHours() * 60 + date.getMinutes();
  }
}
