import { ShiftSegmentBuilder } from "./shiftSegment.builder";
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

    const totalHours = this.shiftService.getDurationShift(shift);

    const extra = extraCalculator.calculate(labeledSegments);
    const special = specialCalculator.calculate(labeledSegments);

    const regular = regularCalculator.calculateFromSegments({
      segments: labeledSegments,
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
