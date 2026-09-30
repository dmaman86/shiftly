import { describe, expect, it } from "vitest";
import { splitTimelineInterval } from "../../src/timeline/split-timeline-interval.js";
import type { TimelineInterval } from "../../src/types/types.js";

const interval: TimelineInterval = {
  point: { start: 870, end: 1440 },
  category: "regular",
  calendarDate: "2026-09-25",
  dayOffset: 0,
  sourceShiftId: "shift-1",
};

describe("splitTimelineInterval", () => {
  it("splits at local clock boundaries while preserving the absolute axis", () => {
    const result = splitTimelineInterval({
      interval,
      boundaries: [360, 840, 1320],
    });

    expect(result).toEqual([
      {
        ...interval,
        point: { start: 870, end: 1320 },
        localPoint: { start: 870, end: 1320 },
      },
      {
        ...interval,
        point: { start: 1320, end: 1440 },
        localPoint: { start: 1320, end: 1440 },
      },
    ]);
  });

  it("uses dayOffset when calculating local clock time", () => {
    const result = splitTimelineInterval({
      interval: {
        ...interval,
        point: { start: 1440, end: 1860 },
        calendarDate: "2026-09-26",
        dayOffset: 1,
      },
      boundaries: [360],
    });

    expect(result).toEqual([
      {
        ...interval,
        point: { start: 1440, end: 1800 },
        calendarDate: "2026-09-26",
        dayOffset: 1,
        localPoint: { start: 0, end: 360 },
      },
      {
        ...interval,
        point: { start: 1800, end: 1860 },
        calendarDate: "2026-09-26",
        dayOffset: 1,
        localPoint: { start: 360, end: 420 },
      },
    ]);
  });
});
