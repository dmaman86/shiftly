import { MonthPayMap, WorkDayMap, WorkDayReducerBundle } from "../types/types";

export class WorkDayMonthReducer {
  constructor(private readonly workDay: WorkDayReducerBundle) {}

  createEmpty() {
    return {
      regular: this.workDay.regular.createEmpty(),
      extra: this.workDay.extra.createEmpty(),
      special: this.workDay.special.createEmpty(),
    };
  }

  accumulate(base: MonthPayMap, add: WorkDayMap) {
    return {
      regular: this.workDay.regular.add(base.regular, add.workMap.regular),
      extra: this.workDay.extra.accumulate(base.extra, add.workMap.extra),
      special: this.workDay.special.accumulate(
        base.special,
        add.workMap.special,
      ),
    };
  }

  subtract(base: MonthPayMap, sub: WorkDayMap) {
    return {
      regular: this.workDay.regular.sub(base.regular, sub.workMap.regular),
      extra: this.workDay.extra.subtract(base.extra, sub.workMap.extra),
      special: this.workDay.special.subtract(base.special, sub.workMap.special),
    };
  }
}
