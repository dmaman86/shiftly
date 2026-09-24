import { describe, expect, it } from "vitest";
import { ExtraCalculator } from "@/domain/calculator/extra/extra.calculator";
import { SpecialCalculator } from "@/domain/calculator/special/special.calculator";
import type { ClassifiedInterval } from "@/domain/types/types";

const intervals: ClassifiedInterval[] = [
  {
    point: { start: 840, end: 1020 },
    category: "regular",
    rule: "evening",
  },
  {
    point: { start: 1020, end: 1080 },
    category: "regular",
    rule: "night",
  },
  {
    point: { start: 1080, end: 1260 },
    category: "special",
    rule: "special150",
  },
  {
    point: { start: 1260, end: 1320 },
    category: "special",
    rule: "special200",
  },
];

describe("classified calculators", () => {
  it("calculates regular premiums only from regular intervals", () => {
    const result = new ExtraCalculator().calculateClassified(intervals);

    expect(result).toEqual({
      hours20: { percent: 0.2, hours: 3 },
      hours50: { percent: 0.5, hours: 1 },
    });
  });

  it("calculates special rates only from special intervals", () => {
    const result = new SpecialCalculator().calculateClassified(intervals);

    expect(result).toEqual({
      shabbat150: { percent: 1.5, hours: 3 },
      shabbat200: { percent: 2, hours: 1 },
    });
  });
});
