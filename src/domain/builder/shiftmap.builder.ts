import { ShiftService } from "../services/shift.service";
import { ShiftMapBuilder } from "../types/services";
import { Shift, ShiftPayMap } from "../types/data-shapes";
import { WorkDayMeta } from "../types/types";
import type { DateService } from "../services/date.service";
import { classifyShiftTimeline, normalizeShiftTimeline } from "../timeline";
import type { TimelineShiftPayCalculator } from "../calculator/timeline-shift-pay.calculator";

export class DefaultShiftMapBuilder implements ShiftMapBuilder {
  constructor(
    private readonly shiftService: ShiftService,
    private readonly timelineLayer: {
      dateService: DateService;
      payCalculator: TimelineShiftPayCalculator;
    },
  ) {}

  build(params: {
    shift: Shift;
    meta: WorkDayMeta;
    standardHours: number;
    isFieldDutyShift: boolean;
  }): ShiftPayMap {
    const { shift, meta, standardHours, isFieldDutyShift } = params;
    const normalizedTimeline = normalizeShiftTimeline({
      shift,
      shiftService: this.shiftService,
    });
    const timeline = normalizedTimeline
      ? classifyShiftTimeline({
          timeline: normalizedTimeline,
          meta,
          dateService: this.timelineLayer.dateService,
        })
      : [];
    const timelinePay = this.timelineLayer.payCalculator.calculate({
      intervals: timeline,
      standardHours,
    });
    const totalHours = normalizedTimeline
      ? this.shiftService.getDurationShift(shift)
      : 0;

    const perDiemShift = {
      hours: totalHours,
      isFieldDutyShift,
    };

    return {
      regular: timelinePay.regular,
      extra: timelinePay.extra,
      special: timelinePay.special,
      totalHours,
      perDiemShift,
      timeline,
    };
  }
}
