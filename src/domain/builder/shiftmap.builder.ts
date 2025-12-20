import {
  LabeledSegmentRange,
  PerDiemShiftCalculator,
  RegularCalculator,
  Shift,
  ShiftMapBuilder,
  ShiftPayMap,
  WorkDayMeta,
  ExtraCalculator,
  SpecialCalculator,
} from "@/domain";

export class DefaultShiftMapBuilder implements ShiftMapBuilder {
  constructor(
    private readonly segmentResolver: {
      resolve(shift: Shift, meta: WorkDayMeta): LabeledSegmentRange[];
    },
    private readonly regularCalculator: RegularCalculator,
    private readonly extraCalculator: ExtraCalculator,
    private readonly specialCalculator: SpecialCalculator,
    private readonly perDiemShiftCalculator: PerDiemShiftCalculator,
  ) {}

  build(params: {
    shift: Shift;
    meta: WorkDayMeta;
    standardHours: number;
    isFieldDutyShift: boolean;
  }): ShiftPayMap {
    const { shift, meta, standardHours, isFieldDutyShift } = params;

    const labeledSegments = this.segmentResolver.resolve(shift, meta);

    const totalHours = (shift.end.minutes - shift.start.minutes) / 60;

    const extra = this.extraCalculator.calculate(labeledSegments);
    const special = this.specialCalculator.calculate(labeledSegments);

    const specialHours = special.shabbat150.hours + special.shabbat200.hours;
    const regularHours = totalHours - specialHours;

    const regular = this.regularCalculator.calculate(
      regularHours,
      standardHours,
      meta,
    );

    const perDiemShift = this.perDiemShiftCalculator.calculate(
      shift,
      isFieldDutyShift,
    );

    return {
      regular,
      extra,
      special,
      totalHours,
      perDiemShift,
    };
  }
}
