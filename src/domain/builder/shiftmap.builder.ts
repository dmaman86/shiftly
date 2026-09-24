import { ShiftSegmentBuilder } from "./shiftSegment.builder";
import { classifyLabeledSegments } from "../classification";
import { ShiftService } from "../services/shift.service";
import { ShiftPayCalculationBundle } from "../types/bundles";
import { ShiftMapBuilder } from "../types/services";
import { Shift, ShiftPayMap } from "../types/data-shapes";
import { WorkDayMeta } from "../types/types";

export class DefaultShiftMapBuilder implements ShiftMapBuilder {
  constructor(
    private readonly segmentBuilder: ShiftSegmentBuilder,
    private readonly shiftsCalculators: ShiftPayCalculationBundle,
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
    const classifiedTimeline = {
      intervals: classifyLabeledSegments({
        segments: labeledSegments,
        sourceShiftId: shift.id,
      }),
    };

    const totalHours = this.shiftService.getDurationShift(shift);

    const extra = extraCalculator.calculateClassified(
      classifiedTimeline.intervals,
    );
    const special = specialCalculator.calculateClassified(
      classifiedTimeline.intervals,
    );
    const regular = regularCalculator.calculateClassified({
      intervals: classifiedTimeline.intervals,
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
      classifiedTimeline,
    };
  }
}
