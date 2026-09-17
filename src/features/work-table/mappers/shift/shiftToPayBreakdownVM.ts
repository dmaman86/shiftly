import { PayBreakdownViewModel, ShiftPayMap } from "@/domain";

const emptySegment = (percent: number) => ({ hours: 0, percent });

export const shiftToPayBreakdownVM = (
  shift: ShiftPayMap,
): PayBreakdownViewModel => ({
  totalHours: shift.totalHours,
  actualHours: shift.totalHours,
  regular: shift.regular,
  extra: shift.extra,
  special: shift.special,
  hours100Sick: emptySegment(1),
  hours100Vacation: emptySegment(1),
  appliedShabbatCredit: emptySegment(1),
  perDiemPoints: 0,
  perDiemAmount: 0,
  largePoints: 0,
  largeAmount: 0,
  smallPoints: 0,
  smallAmount: 0,
});
