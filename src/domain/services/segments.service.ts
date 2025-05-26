import { subtractValues } from "@/utils";
import { paySegmentFactory } from "./paySegmentFactory.service";
import { PaySegment } from "../types/types";
import { extraFields, regularFields, specialFields } from "@/constants";

export const segmentsService = () => {
  const sumSegments = (a: PaySegment, b: PaySegment): PaySegment => {
    return paySegmentFactory({
      percent: a.percent,
      hours: a.hours + b.hours,
    });
  };

  const subtractSegments = (a: PaySegment, b: PaySegment): PaySegment => {
    return paySegmentFactory({
      percent: a.percent,
      hours: subtractValues(a.hours, b.hours),
    });
  };

  const createSectionUtils = <T extends { [K in keyof T]: PaySegment }>(
    keys: readonly (keyof T)[],
  ) => ({
    init: (percents: Record<keyof T, number>, source?: Partial<T>): T =>
      Object.fromEntries(
        keys.map((key) => [
          key,
          paySegmentFactory({
            percent: percents[key],
            hours: source?.[key]?.hours ?? 0,
          }),
        ]),
      ) as T,
    merge: (
      a: T,
      b: T,
      operation: (a: PaySegment, b: PaySegment) => PaySegment,
    ): T =>
      Object.fromEntries(
        keys.map((key) => [key, operation(a[key], b[key])]),
      ) as T,
  });

  return {
    Regular: createSectionUtils(regularFields),
    Extra: createSectionUtils(extraFields),
    Special: createSectionUtils(specialFields),
    sumSegments,
    subtractSegments,
  };
};
