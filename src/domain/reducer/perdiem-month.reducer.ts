import type { PerDiemInfo } from "../types/data-shapes";
import type { PerDiemMonthReducer } from "../types/services";

export class DefaultPerDiemMonthReducer implements PerDiemMonthReducer {
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
}
