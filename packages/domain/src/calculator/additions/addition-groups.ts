import type { AdditionGroupKey, ExtraBreakdown, Segment } from "../../types/data-shapes.js";
import type { AdditionKind } from "./addition.classifier.js";

export const additionGroupKey = (kind: AdditionKind, percent: number): AdditionGroupKey => {
  if (kind === "evening" && percent === 0.2) return "hours20";
  if (kind === "night" && percent === 0.5) return "hours50";
  return `${kind}:${percent}`;
};

export const getAdditionGroups = (extra: ExtraBreakdown): Array<{
  key: AdditionGroupKey;
  kind: AdditionKind;
  segment: Segment;
}> => Object.entries(extra).map(([key, segment]) => {
  const kind = key === "hours20" || key.startsWith("evening:")
    ? "evening"
    : key === "hours50" || key.startsWith("night:")
      ? "night"
      : null;

  if (kind === null) {
    throw new RangeError(`Unknown addition group: "${key}"`);
  }

  return { key: additionGroupKey(kind, segment.percent), kind, segment };
});
