import { PerDiemShiftCalculator, PerDiemShiftInfo, Shift } from "@/domain";

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
    const hours = (shift.end.minutes - shift.start.minutes) / 60;
    return {
      isFieldDutyShift,
      hours,
    };
  }
}
