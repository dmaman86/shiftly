import {
  MonthPayMap,
  MonthPayMapCalculator,
  WorkDayMap,
  PerDiemMonthCalculator,
  MealAllowanceMonthReducer,
  FixedSegmentMonthReducer,
} from "@/domain";
import { WorkDayMonthReducer } from "./workday-month.reducer";

export class MonthPayMapReducer implements MonthPayMapCalculator {
  constructor(
    private readonly workPay: WorkDayMonthReducer,
    private readonly fixed: FixedSegmentMonthReducer,
    private readonly allowances: MealAllowanceMonthReducer,
    private readonly perDiem: PerDiemMonthCalculator,
  ) {}

  createEmpty(): MonthPayMap {
    return {
      ...this.workPay.createEmpty(),
      ...this.fixed.createEmpty(),
      perDiem: this.perDiem.createEmpty(),
      totalHours: 0,
      mealAllowance: this.allowances.createEmpty(),
    };
  }

  accumulate(base: MonthPayMap, add: WorkDayMap): MonthPayMap {
    return {
      ...this.workPay.accumulate(base, add),
      ...this.fixed.accumulate(base, add),
      perDiem: this.perDiem.accumulate(base.perDiem, add.perDiem.diemInfo),
      totalHours: base.totalHours + add.totalHours,
      mealAllowance: this.allowances.accumulate(
        base.mealAllowance,
        add.mealAllowance,
      ),
    };
  }

  subtract(base: MonthPayMap, sub: WorkDayMap): MonthPayMap {
    return {
      ...this.workPay.subtract(base, sub),
      ...this.fixed.subtract(base, sub),
      perDiem: this.perDiem.subtract(base.perDiem, sub.perDiem.diemInfo),
      totalHours: base.totalHours - sub.totalHours,
      mealAllowance: this.allowances.subtract(
        base.mealAllowance,
        sub.mealAllowance,
      ),
    };
  }
}
