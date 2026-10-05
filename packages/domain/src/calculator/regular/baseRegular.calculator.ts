import type {
  RegularBreakdown,
  RegularConfig,
} from "../../types/data-shapes.js";
import type { Reducer } from "../../types/core-behaviors.js";

export abstract class BaseRegularCalculator implements Reducer<RegularBreakdown> {
  protected readonly config: RegularConfig;

  constructor(config?: Partial<RegularConfig>) {
    this.config = {
      midTierThreshold: config?.midTierThreshold ?? 2,
      percentages: {
        hours100: config?.percentages?.hours100 ?? 1,
        hours125: config?.percentages?.hours125 ?? 1.25,
        hours150: config?.percentages?.hours150 ?? 1.5,
      },
    };
  }

  createEmpty(): RegularBreakdown {
    return {
      hours100: { percent: this.config.percentages.hours100, hours: 0 },
      hours125: { percent: this.config.percentages.hours125, hours: 0 },
      hours150: { percent: this.config.percentages.hours150, hours: 0 },
    };
  }

  handleSpecial(totalHours: number): RegularBreakdown {
    return {
      hours100: { percent: this.config.percentages.hours100, hours: 0 },
      hours125: { percent: this.config.percentages.hours125, hours: 0 },
      hours150: {
        percent: this.config.percentages.hours150,
        hours: totalHours,
      },
    };
  }

  accumulate(base: RegularBreakdown, add: RegularBreakdown): RegularBreakdown {
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
}
