import type {
  ExtraBreakdown,
  RegularBreakdown,
  Segment,
  SpecialBreakdown,
  WorkDayMeta,
} from "@/domain";

export type WorkDayInfo = {
  meta: WorkDayMeta;
};

export type PayBreakdownViewModel = {
  totalHours: number;
  actualHours: number;

  regular: RegularBreakdown;
  extra: ExtraBreakdown;
  special: SpecialBreakdown;

  hours100Sick: Segment;
  hours100Vacation: Segment;
  appliedShabbatCredit: Segment;

  perDiemPoints: number;
  perDiemAmount: number;

  largePoints: number;
  largeAmount: number;

  smallPoints: number;
  smallAmount: number;
};

export type CompactPayBreakdownVM = {
  totalHours: number;
  actualHours: number;
  regularHours: number;
  extraHours: number;
  dailySalary?: number;
};
