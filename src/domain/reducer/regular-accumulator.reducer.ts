import {
  RegularBreakdown,
  BaseRegularCalculator,
  RegularReducer,
} from "@/domain";

export class RegularByMonthAccumulator
  extends BaseRegularCalculator
  implements RegularReducer
{
  createEmpty(): RegularBreakdown {
    return super.createEmpty();
  }

  add(base: RegularBreakdown, add: RegularBreakdown): RegularBreakdown {
    return this.accumulate(base, add);
  }

  sub(base: RegularBreakdown, sub: RegularBreakdown): RegularBreakdown {
    return this.subtract(base, sub);
  }
}
