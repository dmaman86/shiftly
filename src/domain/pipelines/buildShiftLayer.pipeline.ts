import { DefaultShiftMapBuilder } from "../builder";
import { TimelineShiftPayCalculator } from "../calculator";
import { BuildShiftLayerParams, ShiftLayer } from "../types/domain.types";

export const buildShiftLayer = ({
  dateService,
  shiftService,
}: BuildShiftLayerParams): ShiftLayer => {
  const shiftMapBuilder = new DefaultShiftMapBuilder(
    shiftService,
    { dateService, payCalculator: new TimelineShiftPayCalculator() },
  );

  return {
    shiftMapBuilder,
  };
};
