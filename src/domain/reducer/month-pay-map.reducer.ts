import {
  MonthPayMap,
  MonthPayMapCalculator,
  WorkDayMap,
  PerDiemMonthCalculator,
  FixedSegmentFactory,
  ExtraCalculator,
  SpecialCalculator,
  RegularReducer,
} from "@/domain";

export class MonthPayMapReducer implements MonthPayMapCalculator {
  constructor(
    private readonly regularAccumulator: RegularReducer,
    private readonly extraCalculator: ExtraCalculator,
    private readonly specialCalculator: SpecialCalculator,
    private readonly sickCalculator: FixedSegmentFactory,
    private readonly vacationCalculator: FixedSegmentFactory,
    private readonly extraShabbatCalculator: FixedSegmentFactory,
    private readonly perDiemMonthCalculator: PerDiemMonthCalculator,
  ) {}

  createEmpty(): MonthPayMap {
    return {
      regular: this.regularAccumulator.createEmpty(),
      extra: this.extraCalculator.createEmpty(),
      special: this.specialCalculator.createEmpty(),
      hours100Sick: this.sickCalculator.create(0),
      hours100Vacation: this.vacationCalculator.create(0),
      extra100Shabbat: this.extraShabbatCalculator.create(0),
      perDiem: this.perDiemMonthCalculator.createEmpty(),
      totalHours: 0,
    };
  }

  accumulate(base: MonthPayMap, add: WorkDayMap): MonthPayMap {
    const totalHoursSick = base.hours100Sick.hours + add.hours100Sick.hours;
    const totalHoursVacation =
      base.hours100Vacation.hours + add.hours100Vacation.hours;
    const totalExtra100Shabbat =
      base.extra100Shabbat.hours + add.extra100Shabbat.hours;

    return {
      regular: this.regularAccumulator.add(base.regular, add.workMap.regular),
      extra: this.extraCalculator.accumulate(base.extra, add.workMap.extra),
      special: this.specialCalculator.accumulate(
        base.special,
        add.workMap.special,
      ),
      hours100Sick: this.sickCalculator.create(totalHoursSick),
      hours100Vacation: this.vacationCalculator.create(totalHoursVacation),
      extra100Shabbat: this.extraShabbatCalculator.create(totalExtra100Shabbat),
      perDiem: this.perDiemMonthCalculator.accumulate(
        base.perDiem,
        add.perDiem.diemInfo,
      ),
      totalHours: base.totalHours + add.totalHours,
    };
  }

  subtract(base: MonthPayMap, sub: WorkDayMap): MonthPayMap {
    const totalHoursSick = Math.max(
      base.hours100Sick.hours - sub.hours100Sick.hours,
      0,
    );
    const totalHoursVacation = Math.max(
      base.hours100Vacation.hours - sub.hours100Vacation.hours,
      0,
    );
    const totalExtra100Shabbat = Math.max(
      base.extra100Shabbat.hours - sub.extra100Shabbat.hours,
      0,
    );

    return {
      regular: this.regularAccumulator.sub(base.regular, sub.workMap.regular),
      extra: this.extraCalculator.subtract(base.extra, sub.workMap.extra),
      special: this.specialCalculator.subtract(
        base.special,
        sub.workMap.special,
      ),
      hours100Sick: this.sickCalculator.create(totalHoursSick),
      hours100Vacation: this.vacationCalculator.create(totalHoursVacation),
      extra100Shabbat: this.extraShabbatCalculator.create(totalExtra100Shabbat),
      perDiem: this.perDiemMonthCalculator.subtract(
        base.perDiem,
        sub.perDiem.diemInfo,
      ),
      totalHours: base.totalHours - sub.totalHours,
    };
  }
}
