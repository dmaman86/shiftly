import { DefaultShiftMapBuilder } from "../builder/index.js";
import { TimelineShiftPayCalculator } from "../calculator/index.js";
import { AdditionClassifier } from "../calculator/additions/addition.classifier.js";
import { BuildShiftLayerParams, ShiftLayer } from "../types/domain.types.js";

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
