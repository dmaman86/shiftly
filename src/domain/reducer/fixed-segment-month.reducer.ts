import { FixedSegmentBundle, MonthPayMap, WorkDayMap } from "@/domain";

export class FixedSegmentMonthReducer {
  constructor(private readonly fixed: FixedSegmentBundle) {}

  createEmpty() {
    return {
      hours100Sick: this.fixed.sick.calculate(0),
      hours100Vacation: this.fixed.vacation.calculate(0),
      earnedShabbatCredit: this.fixed.earnedShabbatCredit.calculate(0),
    };
  }

  accumulate(base: MonthPayMap, add: WorkDayMap) {
    return {
      hours100Sick: this.fixed.sick.calculate(
        base.hours100Sick.hours + add.hours100Sick.hours,
      ),
      hours100Vacation: this.fixed.vacation.calculate(
        base.hours100Vacation.hours + add.hours100Vacation.hours,
      ),
      earnedShabbatCredit: this.fixed.earnedShabbatCredit.calculate(
        base.earnedShabbatCredit.hours + add.earnedShabbatCredit.hours,
      ),
    };
  }

  subtract(base: MonthPayMap, sub: WorkDayMap) {
    return {
      hours100Sick: this.fixed.sick.calculate(
        Math.max(0, base.hours100Sick.hours - sub.hours100Sick.hours),
      ),
      hours100Vacation: this.fixed.vacation.calculate(
        Math.max(0, base.hours100Vacation.hours - sub.hours100Vacation.hours),
      ),
      earnedShabbatCredit: this.fixed.earnedShabbatCredit.calculate(
        Math.max(0, base.earnedShabbatCredit.hours - sub.earnedShabbatCredit.hours),
      ),
    };
  }
}
