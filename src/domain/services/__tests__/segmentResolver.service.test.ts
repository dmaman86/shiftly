import { describe, it, expect } from "vitest";
import { segmentResolver } from "../segmentResolver.service";
import { WorkDayType } from "@/constants";

const resolver = segmentResolver();

describe("segmentResolver", () => {
  it("should return correct segments for regular day", () => {
    const target = { start: 300, end: 1000 }; // 5:00 to 16:40
    const meta = {
      date: "2025-06-08",
      typeDay: WorkDayType.Regular,
      crossDayContinuation: false,
    };

    const segments = resolver({ target, meta });
    expect(segments.length).toBeGreaterThan(0);
    expect(segments.some((s) => s.key === "hours100")).toBe(true);
  });

  it("should return shabbat150 and shabbat200 for SpecialFull", () => {
    const target = { start: 360, end: 1320 }; // 6:00 to 22:00
    const meta = {
      date: "2025-06-07",
      typeDay: WorkDayType.SpecialFull,
      crossDayContinuation: false,
    };

    const segments = resolver({ target, meta });
    expect(segments.every((s) => s.key.startsWith("shabbat"))).toBe(true);
    expect(segments.some((s) => s.key === "shabbat150")).toBe(true);
  });

  it("should use segments from SpecialPartialStart and then SpecialFull when crossing day", () => {
    const target = { start: 1320, end: 90 + 1440 }; // 22:00 to 1:30 next day
    const meta = {
      date: "2025-06-06",
      typeDay: WorkDayType.SpecialPartialStart,
      crossDayContinuation: true,
    };

    const segments = resolver({ target, meta });
    expect(segments.some((s) => s.key === "shabbat200")).toBe(true);
    expect(segments.some((s) => s.key === "shabbat150")).toBe(false);
  });

  it("should resolve night segment wrapping over midnight (Regular)", () => {
    const target = { start: 1300, end: 100 + 1440 }; // 21:00 to 1:40 next day
    const meta = {
      date: "2025-06-03",
      typeDay: WorkDayType.Regular,
      crossDayContinuation: false,
    };

    const segments = resolver({ target, meta });

    expect(segments.some((s) => s.key === "hours50")).toBe(true);
  });
});
