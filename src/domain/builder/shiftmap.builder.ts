import {
  PerDiemShiftCalculator,
  Shift,
  ShiftMapBuilder,
  ShiftPayMap,
  WorkDayMeta,
  PayCalculationBundle,
  ShiftSegmentBuilder,
} from "@/domain";

export class DefaultShiftMapBuilder implements ShiftMapBuilder {
  constructor(
    private readonly segmentBuilder: ShiftSegmentBuilder,
    private readonly shiftsCalculators: PayCalculationBundle,
    private readonly perDiemShiftCalculator: PerDiemShiftCalculator,
  ) {}

  build(params: {
    shift: Shift;
    meta: WorkDayMeta;
    standardHours: number;
    isFieldDutyShift: boolean;
  }): ShiftPayMap {
    const {
      regular: regularCalculator,
      extra: extraCalculator,
      special: specialCalculator,
    } = this.shiftsCalculators;
    const { shift, meta, standardHours, isFieldDutyShift } = params;

    const labeledSegments = this.segmentBuilder.build({ shift, meta });

    const totalHours = (shift.end.minutes - shift.start.minutes) / 60;

    const extra = extraCalculator.calculate(labeledSegments);
    const special = specialCalculator.calculate(labeledSegments);

    const specialHours = special.shabbat150.hours + special.shabbat200.hours;
    const regularHours = totalHours - specialHours;

    const regular = regularCalculator.calculate({
      totalHours: regularHours,
      standardHours,
      meta,
    });

    const perDiemShift = this.perDiemShiftCalculator.calculate({
      shift,
      isFieldDutyShift,
    });

    return {
      regular,
      extra,
      special,
      totalHours,
      perDiemShift,
    };
  }
}
