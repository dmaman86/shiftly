import { describe, expect, it } from "vitest";
import { resolveForYear } from "../../src/shared/year-resolution.ts";

const values = [
  { fromYear: 2023, toYear: 2023, value: "a" },
  { fromYear: 2024, toYear: 2025, value: "b" },
];

describe("resolveForYear", () => {
  it("uses the value that covers the year", () => {
    expect(resolveForYear(values, 2023)).toEqual({
      value: "a",
      effectiveYear: 2023,
      carriedForward: false,
    });
  });

  it("treats every year of a range as covered", () => {
    expect(resolveForYear(values, 2025)).toEqual({
      value: "b",
      effectiveYear: 2025,
      carriedForward: false,
    });
  });

  it("carries the latest earlier value forward and says so", () => {
    expect(resolveForYear(values, 2026)).toEqual({
      value: "b",
      effectiveYear: 2025,
      carriedForward: true,
    });
  });

  it("does not depend on the input order", () => {
    expect(resolveForYear([...values].reverse(), 2027)).toMatchObject({
      value: "b",
      effectiveYear: 2025,
    });
  });

  it("returns null when nothing is published for that year or before", () => {
    expect(resolveForYear(values, 2022)).toBeNull();
  });
});
