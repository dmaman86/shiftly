import { WorkDayStatus } from "@/constants";
import {
  DayPayMapBuilder,
  WorkDayMap,
  PerDiemShiftInfo,
  ShiftPayMap,
  WorkDayMeta,
  PayCalculationBundle,
  FixedSegmentBundle,
  PerDiemBundle,
  MealAllowanceBundle,
  ExtraBreakdown,
  SpecialBreakdown,
} from "@/domain";

export class DefaultDayPayMapBuilder implements DayPayMapBuilder {
  constructor(
    private readonly payCalculators: PayCalculationBundle,
    private readonly fixedSegments: FixedSegmentBundle,
    private readonly perDiem: PerDiemBundle,
    private readonly mealAllowance: MealAllowanceBundle,
  ) {}

  private initBreakdown() {
    const { regular, extra, special } = this.payCalculators;
    const { resolver } = this.mealAllowance;

    return {
      regular: regular.createEmpty(),
      extra: extra.createEmpty(),
      special: special.createEmpty(),
      mealAllowance: resolver.createEmpty(),
    };
  }

  private buildNonWorkingDay(params: {
    status: WorkDayStatus;
    standardHours: number;
  }): WorkDayMap {
    const { sick, vacation, extraShabbat } = this.fixedSegments;
    const { calculator } = this.perDiem;

    const hoursSick =
      params.status === WorkDayStatus.sick ? params.standardHours : 0;
    const hoursVacation =
      params.status === WorkDayStatus.vacation ? params.standardHours : 0;

    const init = this.initBreakdown();

    return {
      workMap: {
        regular: init.regular,
        extra: init.extra,
        special: init.special,
        totalHours: params.standardHours,
      },
      hours100Sick: sick.create(hoursSick),
      hours100Vacation: vacation.create(hoursVacation),
      extra100Shabbat: extraShabbat.create(0),
      perDiem: calculator.calculate({ shifts: [], rate: 0 }),
      totalHours: params.standardHours,
      mealAllowance: init.mealAllowance,
    };
  }

  private accumulateShifts(shifts: ShiftPayMap[]) {
    let extra = this.payCalculators.extra.createEmpty();
    let special = this.payCalculators.special.createEmpty();
    let totalHours = 0;
    const perDiemShifts: PerDiemShiftInfo[] = [];

    for (const shift of shifts) {
      extra = this.payCalculators.extra.accumulate(extra, shift.extra);
      special = this.payCalculators.special.accumulate(special, shift.special);
      perDiemShifts.push(shift.perDiemShift);
      totalHours += shift.totalHours;
    }

    return { extra, special, totalHours, perDiemShifts };
  }

  private calculatePerDiem(
    shifts: PerDiemShiftInfo[],
    year: number,
    month: number,
  ) {
    const rate = this.perDiem.rateResolver.resolve({ year, month });
    return this.perDiem.calculator.calculate({
      shifts,
      rate,
    });
  }

  private classifyMealAllowanceDayInfo(params: {
    totalHours: number;
    extra: ExtraBreakdown;
    special: SpecialBreakdown;
    isFieldDutyDay: boolean;
  }) {
    // Night hours are represented by 50% (regular nights) or 200% (special nights)
    const nightHours =
      params.extra.hours50.hours + params.special.shabbat200.hours;

    const totalInt = Math.floor(params.totalHours);
    // Business rule: night is considered "meaningful" only from 4 hours and above
    const NIGHT_THRESHOLD = 4;

    if (nightHours < NIGHT_THRESHOLD) {
      // Day single shift (even if it slightly touches night boundaries)
      return {
        totalHours: params.totalHours,
        hasMorning: true,
        hasNight: false,
        isFieldDutyDay: params.isFieldDutyDay,
      };
    }

    const nightInt = Math.max(1, Math.floor(nightHours));
    const ratio = totalInt / nightInt;

    return {
      totalHours: params.totalHours,
      hasMorning: ratio >= 2,
      hasNight: true,
      isFieldDutyDay: params.isFieldDutyDay,
    };
  }

  build(params: {
    shifts: ShiftPayMap[];
    status: WorkDayStatus;
    meta: WorkDayMeta;
    standardHours: number;
    year: number;
    month: number;
  }): WorkDayMap {
    const { shifts, status, meta, standardHours, year, month } = params;

    if (status !== WorkDayStatus.normal) {
      return this.buildNonWorkingDay({ status, standardHours });
    }

    const { extra, special, totalHours, perDiemShifts } =
      this.accumulateShifts(shifts);

    const totalExtraShabbat =
      special.shabbat150.hours + special.shabbat200.hours;
    const regular = this.payCalculators.regular.calculate({
      totalHours: totalHours - totalExtraShabbat,
      standardHours,
      meta,
    });
    const perDiem = this.calculatePerDiem(perDiemShifts, year, month);

    const dayInfo = this.classifyMealAllowanceDayInfo({
      totalHours,
      extra,
      special,
      isFieldDutyDay: perDiem.isFieldDutyDay,
    });

    const mealAllowance = this.mealAllowance.resolver.resolve({
      day: dayInfo,
      rates: this.mealAllowance.rateResolver.resolve({ year, month }),
    });

    return {
      workMap: { regular, extra, special, totalHours },
      hours100Sick: this.fixedSegments.sick.create(0),
      hours100Vacation: this.fixedSegments.vacation.create(0),
      extra100Shabbat:
        this.fixedSegments.extraShabbat.create(totalExtraShabbat),
      perDiem,
      totalHours,
      mealAllowance,
    };
  }
}
