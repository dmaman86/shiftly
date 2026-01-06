import type { PerDiemInfo } from "@/domain/types/data-shapes";
import type { PerDiemMonthReducer } from "@/domain/types/services";

export class DefaultPerDiemMonthCalculator implements PerDiemMonthReducer {
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
      points: Math.max(base.points - sub.points, 0),
      amount: Math.max(base.amount - sub.amount, 0),
    };
  }
}
