import { WorkDayStatus } from "@/domain/constants";
import {
  FixedSegmentBundle,
  MealAllowanceBundle,
  PayCalculationBundle,
  PerDiemBundle,
} from "../types/bundles";
import { DayPayMapBuilder } from "../types/services";
import {
  ExtraBreakdown,
  ShiftPayMap,
  SpecialBreakdown,
  WorkDayMap,
} from "../types/data-shapes";
import { PerDiemShiftInfo, TimelineInterval, WorkDayMeta } from "../types/types";
import { getAdditionGroups } from "../calculator/additions/addition-groups";

export class DefaultDayPayMapBuilder implements DayPayMapBuilder {
  constructor(
    private readonly payCalculators: PayCalculationBundle,
    private readonly fixedSegments: FixedSegmentBundle,
    private readonly perDiem: PerDiemBundle,
    private readonly mealAllowance: MealAllowanceBundle,
  ) {}

  private initBreakdown() {
    const { regular, extra, special } = this.payCalculators;
    const { calculator } = this.mealAllowance;

    return {
      regular: regular.createEmpty(),
      extra: extra.createEmpty(),
      special: special.createEmpty(),
      mealAllowance: calculator.createEmpty(),
    };
  }

  private buildNonWorkingDay(params: {
    status: WorkDayStatus;
    standardHours: number;
  }): WorkDayMap {
    const { sick, vacation, earnedShabbatCredit } = this.fixedSegments;
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
      hours100Sick: sick.calculate(hoursSick),
      hours100Vacation: vacation.calculate(hoursVacation),
      earnedShabbatCredit: earnedShabbatCredit.calculate(0),
      perDiem: calculator.calculateDay({ shifts: [], rate: 0 }),
      totalHours: params.standardHours,
      mealAllowance: init.mealAllowance,
    };
  }

  private accumulateShiftInputs(
    shifts: ShiftPayMap[],
  ) {
    let extra = this.payCalculators.extra.createEmpty();
    let special = this.payCalculators.special.createEmpty();
    let totalHours = 0;
    const perDiemShifts: PerDiemShiftInfo[] = [];
    const timelineIntervals: TimelineInterval[] = [];

    for (const shift of shifts) {
      extra = this.payCalculators.extra.accumulate(extra, shift.extra);
      special = this.payCalculators.special.accumulate(special, shift.special);
      perDiemShifts.push(shift.perDiemShift);
      totalHours += shift.totalHours;
      timelineIntervals.push(...shift.timeline);
    }

    timelineIntervals.sort((a, b) => a.point.start - b.point.start);

    return { extra, special, totalHours, perDiemShifts, timelineIntervals };
  }

  private calculatePerDiem(
    shifts: PerDiemShiftInfo[],
    year: number,
    month: number,
  ) {
    const rate = this.perDiem.calculator.calculateRate({ year, month });
    return this.perDiem.calculator.calculateDay({
      shifts,
      rate,
    });
  }

  private createMealAllowanceDayInfo(params: {
    totalHours: number;
    extra: ExtraBreakdown;
    special: SpecialBreakdown;
    isFieldDutyDay: boolean;
  }) {
    const nightHours =
      getAdditionGroups(params.extra)
        .filter(({ kind }) => kind === "night")
        .reduce((total, { segment }) => total + segment.hours, 0)
      + params.special.shabbat200.hours;

    return {
      totalHours: params.totalHours,
      nightHours,
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

    const {
      extra,
      special,
      totalHours,
      perDiemShifts,
      timelineIntervals,
    } = this.accumulateShiftInputs(shifts);

    const totalExtraShabbat =
      special.shabbat150.hours + special.shabbat200.hours;
    const regular = this.payCalculators.regular.calculateFromTimeline({
      intervals: timelineIntervals,
      standardHours,
      meta,
    });
    const perDiem = this.calculatePerDiem(perDiemShifts, year, month);

    const dayInfo = this.createMealAllowanceDayInfo({
      totalHours,
      extra,
      special,
      isFieldDutyDay: perDiem.isFieldDutyDay,
    });

    const mealAllowance = this.mealAllowance.calculator.calculateAllowance({
      day: dayInfo,
      year,
      month,
    });

    const result: WorkDayMap = {
      workMap: { regular, extra, special, totalHours },
      hours100Sick: this.fixedSegments.sick.calculate(0),
      hours100Vacation: this.fixedSegments.vacation.calculate(0),
      earnedShabbatCredit:
        this.fixedSegments.earnedShabbatCredit.calculate(totalExtraShabbat),
      perDiem,
      totalHours,
      mealAllowance,
    };

    return result;
  }
}
