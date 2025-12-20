import {
  RegularByShiftCalculator,
  RegularByDayCalculator,
  RegularByMonthAccumulator,
  RegularCalculator,
  RegularReducer,
} from "@/domain";

export class RegularFactory {
  static byShift(): RegularCalculator {
    return new RegularByShiftCalculator();
  }

  static byDay(): RegularCalculator {
    return new RegularByDayCalculator();
  }

  static monthReducer(): RegularReducer {
    return new RegularByMonthAccumulator();
  }
}
