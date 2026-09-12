import { DefaultShiftMapBuilder, ShiftSegmentBuilder } from "../builder";
import { ShiftSegmentCalculator } from "../calculator";
import { PayCalculationBundle } from "../types/bundles";
import { BuildShiftLayerParams, ShiftLayer } from "../types/domain.types";

export const buildShiftLayer = ({
  dateService,
  shiftService,
  calculators,
}: BuildShiftLayerParams): ShiftLayer => {
  const segmentResolver = new ShiftSegmentCalculator(dateService);
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
    shiftService,
  );

  return {
    shiftMapBuilder,
  };
};
