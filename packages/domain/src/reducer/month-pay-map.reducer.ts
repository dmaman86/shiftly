import { FixedSegmentMonthReducer } from "./fixed-segment-month.reducer.js";
import { MealAllowanceMonthReducer } from "./meal-allowance-month.reducer.js";
import { MonthPayMap, WorkDayMap } from "../types/data-shapes.js";
import { PerDiemMonthReducer } from "../types/services.js";
import { Reducer } from "../types/core-behaviors.js";
import { WorkDayMonthReducer } from "./workday-month.reducer.js";

export class MonthPayMapReducer implements Reducer<MonthPayMap, WorkDayMap> {
  constructor(
    private readonly workPay: WorkDayMonthReducer,
    private readonly fixed: FixedSegmentMonthReducer,
    private readonly allowances: MealAllowanceMonthReducer,
    private readonly perDiem: PerDiemMonthReducer,
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
}
