import { DefaultShiftMapBuilder, ShiftSegmentBuilder } from "../builder";
import { ShiftSegmentResolver } from "../resolve";
import { PayCalculationBundle } from "../types/bundles";
import { BuildShiftLayerParams, ShiftLayer } from "../types/domain.types";

export const buildShiftLayer = ({
  shiftService,
  calculators,
}: BuildShiftLayerParams): ShiftLayer => {
  const segmentResolver = new ShiftSegmentResolver();
  const shiftSegmentBuilder = new ShiftSegmentBuilder(
    segmentResolver,
    shiftService,
  );

  const shiftsCalculators: PayCalculationBundle = {
    regular: calculators.regular.byShift,
    extra: calculators.extra,
    special: calculators.special,
  };

  const shiftMapBuilder = new DefaultShiftMapBuilder(
    shiftSegmentBuilder,
    shiftsCalculators,
    calculators.perDiem.shift,
    shiftService,
  );

  return {
    shiftMapBuilder,
  };
};
