import { FixedSegmentBundle, MonthPayMap, WorkDayMap } from "@/domain";

export class FixedSegmentMonthReducer {
  constructor(private readonly fixed: FixedSegmentBundle) {}

  createEmpty() {
    return {
      hours100Sick: this.fixed.sick.create(0),
      hours100Vacation: this.fixed.vacation.create(0),
      extra100Shabbat: this.fixed.extraShabbat.create(0),
    };
  }

  accumulate(base: MonthPayMap, add: WorkDayMap) {
    return {
      hours100Sick: this.fixed.sick.create(
        base.hours100Sick.hours + add.hours100Sick.hours,
      ),
      hours100Vacation: this.fixed.vacation.create(
        base.hours100Vacation.hours + add.hours100Vacation.hours,
      ),
      extra100Shabbat: this.fixed.extraShabbat.create(
        base.extra100Shabbat.hours + add.extra100Shabbat.hours,
      ),
    };
  }

  subtract(base: MonthPayMap, sub: WorkDayMap) {
    return {
      hours100Sick: this.fixed.sick.create(
        Math.max(0, base.hours100Sick.hours - sub.hours100Sick.hours),
      ),
      hours100Vacation: this.fixed.vacation.create(
        Math.max(0, base.hours100Vacation.hours - sub.hours100Vacation.hours),
      ),
      extra100Shabbat: this.fixed.extraShabbat.create(
        Math.max(0, base.extra100Shabbat.hours - sub.extra100Shabbat.hours),
      ),
    };
  }
}
