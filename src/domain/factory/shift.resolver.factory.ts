import { DateUtils } from "@/utils";
import {
  ShiftSegmentMapBuilder,
  ShiftSegmentResolver,
  Shift,
  WorkDayMeta,
  LabeledSegmentRange,
} from "@/domain";

export class ShiftResolverFactory {
  static create() {
    const segmentBuilder = new ShiftSegmentMapBuilder();

    const resolver = new ShiftSegmentResolver();

    const { getSpecialStartMinutes } = DateUtils();

    return {
      resolve(shift: Shift, meta: WorkDayMeta): LabeledSegmentRange[] {
        const specialStart = getSpecialStartMinutes(meta.date);
        const segmentMap = segmentBuilder.build(specialStart);
        return resolver.resolve(shift, meta, segmentMap);
      },
    };
  }
}
