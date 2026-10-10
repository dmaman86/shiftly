import { describe, expect, it } from "vitest";

import { getShiftEndTimeErrorKey } from "@/features/work-table/helpers";

const at = (time: string) => new Date(`2026-09-15T${time}:00`);

describe("getShiftEndTimeErrorKey", () => {
  it.each([
    {
      name: "overlap wins over equal times",
      hasOverlap: true,
      start: at("08:00"),
      end: at("08:00"),
      expected: "a11y.overlap",
    },
    {
      name: "equal start and end",
      hasOverlap: false,
      start: at("08:00"),
      end: at("08:00"),
      expected: "a11y.equal_times",
    },
    {
      name: "any other invalid range",
      hasOverlap: false,
      start: at("16:00"),
      end: at("08:00"),
      expected: "a11y.invalid_range",
    },
  ])("$name", ({ hasOverlap, start, end, expected }) => {
    expect(getShiftEndTimeErrorKey(hasOverlap, start, end)).toBe(expected);
  });
});
