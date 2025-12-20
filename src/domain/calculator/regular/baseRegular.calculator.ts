import { RegularBreakdown } from "@/domain/types/types";

export abstract class BaseRegularCalculator {
  protected readonly MID_TIER = 2; // 2 hours

  protected readonly fieldShiftPercent: Record<string, number> = {
    hours100: 1,
    hours125: 1.25,
    hours150: 1.5,
  };

  constructor() {}

  createEmpty(): RegularBreakdown {
    return {
      hours100: { percent: this.fieldShiftPercent.hours100, hours: 0 },
      hours125: { percent: this.fieldShiftPercent.hours125, hours: 0 },
      hours150: { percent: this.fieldShiftPercent.hours150, hours: 0 },
    };
  }

  protected handleSpecial(totalHours: number): RegularBreakdown {
    return {
      hours100: { percent: this.fieldShiftPercent.hours100, hours: 0 },
      hours125: { percent: this.fieldShiftPercent.hours125, hours: 0 },
      hours150: { percent: this.fieldShiftPercent.hours150, hours: totalHours },
    };
  }

  protected accumulate(
    base: RegularBreakdown,
    add: RegularBreakdown,
  ): RegularBreakdown {
    return {
      hours100: {
        percent: base.hours100.percent,
        hours: base.hours100.hours + add.hours100.hours,
      },
      hours125: {
        percent: base.hours125.percent,
        hours: base.hours125.hours + add.hours125.hours,
      },
      hours150: {
        percent: base.hours150.percent,
        hours: base.hours150.hours + add.hours150.hours,
      },
    };
  }

  protected subtract(
    base: RegularBreakdown,
    sub: RegularBreakdown,
  ): RegularBreakdown {
    return {
      hours100: {
        percent: base.hours100.percent,
        hours: base.hours100.hours - sub.hours100.hours,
      },
      hours125: {
        percent: base.hours125.percent,
        hours: base.hours125.hours - sub.hours125.hours,
      },
      hours150: {
        percent: base.hours150.percent,
        hours: base.hours150.hours - sub.hours150.hours,
      },
    };
  }
}
