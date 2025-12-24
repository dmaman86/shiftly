import {
  RegularByShiftCalculator,
  RegularByDayCalculator,
  RegularByMonthAccumulator,
  RegularCalculator,
  RegularBreakdown,
  Reducer,
} from "@/domain";

export class RegularFactory {
  static byShift(): RegularCalculator {
    return new RegularByShiftCalculator();
  }

  static byDay(): RegularCalculator {
    return new RegularByDayCalculator();
  }

  static monthReducer(): Reducer<RegularBreakdown> {
    return new RegularByMonthAccumulator();
  }
}
