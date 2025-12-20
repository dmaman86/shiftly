import { PerDiemMonthCalculator, PerDiemInfo } from "@/domain";

export class DefaultPerDiemMonthCalculator implements PerDiemMonthCalculator {
  createEmpty() {
    return { tier: null, points: 0, amount: 0 };
  }

  accumulate(base: PerDiemInfo, add: PerDiemInfo): PerDiemInfo {
    return {
      tier: null,
      points: base.points + add.points,
      amount: base.amount + add.amount,
    };
  }

  subtract(base: PerDiemInfo, sub: PerDiemInfo): PerDiemInfo {
    return {
      tier: null,
      points: base.points - sub.points,
      amount: base.amount - sub.amount,
    };
  }
}
