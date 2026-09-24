import type {
  ClassifiedInterval,
  LabeledSegmentRange,
  TimelineCategory,
  TimelineRule,
} from "../types/types";

const ruleBySegmentKey: Record<LabeledSegmentRange["key"], TimelineRule> = {
  hours100: "regular",
  hours20: "evening",
  hours50: "night",
  shabbat150: "special150",
  shabbat200: "special200",
};

const specialRules = new Set<TimelineRule>(["special150", "special200"]);

export const classifyLabeledSegments = (params: {
  segments: LabeledSegmentRange[];
  sourceShiftId?: string;
}): ClassifiedInterval[] =>
  params.segments.map((segment) => {
    const rule = ruleBySegmentKey[segment.key];

    return {
      point: segment.point,
      category: specialRules.has(rule) ? "special" : "regular",
      rule,
      sourceShiftId: params.sourceShiftId,
    };
  });

export const selectIntervalsByCategory = (
  intervals: ClassifiedInterval[],
  category: TimelineCategory,
): ClassifiedInterval[] => intervals.filter((interval) => interval.category === category);

export const selectRegularIntervals = (
  intervals: ClassifiedInterval[],
): ClassifiedInterval[] => selectIntervalsByCategory(intervals, "regular");

export const selectSpecialIntervals = (
  intervals: ClassifiedInterval[],
): ClassifiedInterval[] => selectIntervalsByCategory(intervals, "special");
