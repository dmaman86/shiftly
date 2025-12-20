import { PerDiemShiftCalculator, PerDiemShiftInfo, Shift } from "@/domain";

export class DefaultPerDiemShiftCalculator implements PerDiemShiftCalculator {
  createEmpty(): PerDiemShiftInfo {
    return {
      isFieldDutyShift: false,
      hours: 0,
    };
  }

  calculate(shift: Shift, isFieldDutyShift: boolean): PerDiemShiftInfo {
    const hours = (shift.end.minutes - shift.start.minutes) / 60;
    return {
      isFieldDutyShift,
      hours,
    };
  }
}
