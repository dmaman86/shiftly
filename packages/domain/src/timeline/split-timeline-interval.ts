import type { Point, TimelineInterval, TimelineSlice } from "../types/types.js";

const MINUTES_PER_DAY = 1440;

/**
 * Splits a classified interval at caller-provided local-clock boundaries.
 * This is a mechanical operation: it does not assign salary rates or rules.
 */
export const splitTimelineInterval = (params: {
  interval: TimelineInterval;
  boundaries: number[];
}): TimelineSlice[] => {
  const { interval, boundaries } = params;
  const dayStart = interval.dayOffset * MINUTES_PER_DAY;
  const localPoint: Point = {
    start: interval.point.start - dayStart,
    end: interval.point.end - dayStart,
  };

  if (localPoint.start >= localPoint.end) return [];

  const cuts = [...new Set(boundaries)]
    .filter(
      (boundary) => boundary > localPoint.start && boundary < localPoint.end,
    )
    .sort((a, b) => a - b);
  const points = [localPoint.start, ...cuts, localPoint.end];

  return points.slice(0, -1).flatMap((start, index) => {
    const end = points[index + 1];
    if (start >= end) return [];

    return [
      {
        ...interval,
        point: {
          start: dayStart + start,
          end: dayStart + end,
        },
        localPoint: { start, end },
      },
    ];
  });
};
