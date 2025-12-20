import { WorkDayStatus } from "@/constants";
import {
  DayPayMapBuilder,
  ExtraCalculator,
  FixedSegmentFactory,
  WorkDayMap,
  PerDiemDayCalculator,
  PerDiemShiftInfo,
  RegularCalculator,
  ShiftPayMap,
  SpecialCalculator,
  TimelinePerDiemRateResolver,
  WorkDayMeta,
} from "@/domain";

export class DefaultDayPayMapBuilder implements DayPayMapBuilder {
  constructor(
    private readonly regularCalculator: RegularCalculator,
    private readonly extraCalculator: ExtraCalculator,
    private readonly specialCalculator: SpecialCalculator,
    private readonly sickCalculator: FixedSegmentFactory,
    private readonly vacationCalculator: FixedSegmentFactory,
    private readonly extraShabbatCalculator: FixedSegmentFactory,
    private readonly perDiemDayCalculator: PerDiemDayCalculator,
    private readonly perDiemRateResolver: TimelinePerDiemRateResolver,
  ) {}

  build(params: {
    shifts: ShiftPayMap[];
    status: WorkDayStatus;
    meta: WorkDayMeta;
    standardHours: number;
    year: number;
    month: number;
  }): WorkDayMap {
    const { shifts, status, meta, standardHours, year, month } = params;

    let regular = this.regularCalculator.createEmpty();
    let extra = this.extraCalculator.createEmpty();
    let special = this.specialCalculator.createEmpty();

    if (status !== WorkDayStatus.normal) {
      const hoursSick = status === WorkDayStatus.sick ? standardHours : 0;
      const hoursVacation =
        status === WorkDayStatus.vacation ? standardHours : 0;

      const sick = this.sickCalculator.create(hoursSick);
      const vacation = this.vacationCalculator.create(hoursVacation);
      return {
        workMap: { regular, extra, special, totalHours: standardHours },
        hours100Sick: sick,
        hours100Vacation: vacation,
        extra100Shabbat: this.extraShabbatCalculator.create(0),
        perDiem: this.perDiemDayCalculator.calculate({ shifts: [], rate: 0 }),
        totalHours: standardHours,
      };
    }

    const perDiemShifts: PerDiemShiftInfo[] = [];
    let totalHours = 0;

    for (const shift of shifts) {
      extra = this.extraCalculator.accumulate(extra, shift.extra);
      special = this.specialCalculator.accumulate(special, shift.special);
      perDiemShifts.push(shift.perDiemShift);
      totalHours += shift.totalHours;
    }

    const totalExtraShabbat =
      special.shabbat150.hours + special.shabbat200.hours;
    const totalRegularHours = totalHours - totalExtraShabbat;

    regular = this.regularCalculator.calculate(
      totalRegularHours,
      standardHours,
      meta,
    );
    const rate = this.perDiemRateResolver.getRateForRate(year, month);
    const dailyPerDiem = this.perDiemDayCalculator.calculate({
      shifts: perDiemShifts,
      rate,
    });

    return {
      workMap: { regular, extra, special, totalHours },
      hours100Sick: this.sickCalculator.create(0),
      hours100Vacation: this.vacationCalculator.create(0),
      extra100Shabbat: this.extraShabbatCalculator.create(totalExtraShabbat),
      perDiem: dailyPerDiem,
      totalHours,
    };
  }
}
