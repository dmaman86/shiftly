import { WorkDayReducerBundle } from "../types/bundles.js";
import { WorkDayMap, WorkPayPart } from "../types/data-shapes.js";
import { Reducer } from "../types/core-behaviors.js";

export class WorkDayMonthReducer implements Reducer<WorkPayPart, WorkDayMap> {
  constructor(private readonly workDay: WorkDayReducerBundle) {}

  createEmpty(): WorkPayPart {
    return {
      regular: this.workDay.regular.createEmpty(),
      extra: this.workDay.extra.createEmpty(),
      special: this.workDay.special.createEmpty(),
    };
  }

  accumulate(base: WorkPayPart, add: WorkDayMap): WorkPayPart {
    return {
      regular: this.workDay.regular.accumulate(
        base.regular,
        add.workMap.regular,
      ),
      extra: this.workDay.extra.accumulate(base.extra, add.workMap.extra),
      special: this.workDay.special.accumulate(
        base.special,
        add.workMap.special,
      ),
    };
  }
}
