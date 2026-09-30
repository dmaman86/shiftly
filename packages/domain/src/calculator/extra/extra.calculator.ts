import type { ExtraBreakdown } from "../../types/data-shapes.js";
import type { Reducer } from "../../types/core-behaviors.js";
import { additionGroupKey, getAdditionGroups } from "../additions/addition-groups.js";

export class ExtraCalculator implements Reducer<ExtraBreakdown> {
  private readonly fieldShiftPercent: Record<string, number> = {
    hours20: 0.2,
    hours50: 0.5,
  };
  createEmpty(): ExtraBreakdown {
    return {
      hours20: { percent: this.fieldShiftPercent.hours20, hours: 0 },
      hours50: { percent: this.fieldShiftPercent.hours50, hours: 0 },
    };
  }

  accumulate(base: ExtraBreakdown, add: ExtraBreakdown): ExtraBreakdown {
    const result = this.createEmpty();
    for (const { kind, segment } of [
      ...getAdditionGroups(base),
      ...getAdditionGroups(add),
    ]) {
      if (segment.hours === 0) continue;
      const key = additionGroupKey(kind, segment.percent);
      result[key] = {
        percent: segment.percent,
        hours: (result[key]?.hours ?? 0) + segment.hours,
      };
    }
    return result;
  }
}
