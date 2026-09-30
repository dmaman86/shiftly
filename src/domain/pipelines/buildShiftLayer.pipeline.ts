import { DefaultShiftMapBuilder } from "../builder";
import { TimelineShiftPayCalculator } from "../calculator";
import { AdditionClassifier } from "../calculator/additions/addition.classifier";
import { BuildShiftLayerParams, ShiftLayer } from "../types/domain.types";

export const buildShiftLayer = ({
  dateService,
  shiftService,
  additionPolicy,
}: BuildShiftLayerParams): ShiftLayer => {
  const shiftMapBuilder = new DefaultShiftMapBuilder(
    shiftService,
    {
      dateService,
      payCalculator: new TimelineShiftPayCalculator(
        undefined,
        new AdditionClassifier(additionPolicy),
      ),
    },
  );

  return {
    shiftMapBuilder,
  };
};
