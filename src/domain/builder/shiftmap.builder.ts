import { ShiftSegmentBuilder } from "./shiftSegment.builder";
import { ShiftService } from "../services/shift.service";
import { PayCalculationBundle } from "../types/bundles";
import { ShiftMapBuilder } from "../types/services";
import { Shift, ShiftPayMap } from "../types/data-shapes";
import { WorkDayMeta } from "../types/types";

export class DefaultShiftMapBuilder implements ShiftMapBuilder {
  constructor(
    private readonly segmentBuilder: ShiftSegmentBuilder,
    private readonly shiftsCalculators: PayCalculationBundle,
    private readonly shiftService: ShiftService,
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

    const totalHours = this.shiftService.getDurationShift(shift);

    const extra = extraCalculator.calculate(labeledSegments);
    const special = specialCalculator.calculate(labeledSegments);

    const regularSegments = labeledSegments
      .filter((segment) =>
        segment.key !== "shabbat150" && segment.key !== "shabbat200",
      )
      .sort((a, b) => a.point.start - b.point.start);

    // Segment definitions can touch or overlap at a rate boundary. Use their
    // union so regular hours represent elapsed time rather than label count.
    const regularHours = regularSegments.reduce(
      (state, segment) => {
        const start = Math.max(segment.point.start, state.coveredUntil);
        const end = Math.max(segment.point.end, state.coveredUntil);

        return {
          coveredUntil: end,
          hours: state.hours + Math.max(end - start, 0) / 60,
        };
      },
      { coveredUntil: Number.NEGATIVE_INFINITY, hours: 0 },
    ).hours;

    const regular = regularCalculator.calculate({
      totalHours: regularHours,
      standardHours,
      meta,
    });

    const perDiemShift = {
      hours: totalHours,
      isFieldDutyShift,
    };

    return {
      regular,
      extra,
      special,
      totalHours,
      perDiemShift,
    };
  }
}
