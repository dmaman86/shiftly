import {
  MonthPayMap,
  Reducer,
  WorkDayMap,
  WorkDayReducerBundle,
  WorkPayPart,
} from "@/domain";

export class WorkDayMonthReducer implements Reducer<WorkPayPart, WorkDayMap> {
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

  subtract(base: MonthPayMap, sub: WorkDayMap) {
    return {
      regular: this.workDay.regular.subtract(base.regular, sub.workMap.regular),
      extra: this.workDay.extra.subtract(base.extra, sub.workMap.extra),
      special: this.workDay.special.subtract(base.special, sub.workMap.special),
    };
  }
}
