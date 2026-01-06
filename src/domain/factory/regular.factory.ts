import { RegularByShiftCalculator } from "@/domain/calculator/regular/regularByShift.calculator";
import { RegularByDayCalculator } from "@/domain/calculator/regular/regularByDay.calculator";
import { RegularByMonthAccumulator } from "@/domain/reducer/regular-accumulator.reducer";
import type { RegularCalculator } from "@/domain/types/services";
import type { RegularBreakdown } from "@/domain/types/data-shapes";
import type { Reducer } from "@/domain/types/core-behaviors";

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
