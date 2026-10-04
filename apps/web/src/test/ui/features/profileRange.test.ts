import { describe, expect, it } from "vitest";
import {
  formatProfileMonthInput, getPresetProfileRange, getProfileMonths,
  getProfileRangeError, parseProfileMonthInput,
} from "@/features/profile/helpers/profileRange";

const now = { year: 2026, month: 2 };

describe("profile date ranges", () => {
  it.each([
    ["last3", { year: 2025, month: 12 }],
    ["last6", { year: 2025, month: 9 }],
    ["last12", { year: 2025, month: 3 }],
    ["year", { year: 2026, month: 1 }],
  ] as const)("resolves %s inclusively through the current month", (preset, from) => {
    expect(getPresetProfileRange(preset, now)).toEqual({ from, to: now });
  });

  it("clamps presets to the application's first supported month", () => {
    expect(getPresetProfileRange("last12", { year: 2016, month: 1 }).from).toEqual({ year: 2015, month: 11 });
  });

  it("includes both endpoints of a custom range across years", () => {
    expect(getProfileMonths({ from: { year: 2024, month: 12 }, to: { year: 2025, month: 2 } })).toEqual([
      { year: 2024, month: 12 }, { year: 2025, month: 1 }, { year: 2025, month: 2 },
    ]);
  });

  it("accepts a single month", () => {
    expect(getProfileMonths({ from: now, to: now })).toEqual([now]);
  });

  it.each(["", "2026-00", "2026-13", "2026-2", "2026-02-01", "x-02"])("rejects invalid input %s", (value) => {
    expect(parseProfileMonthInput(value)).toBeNull();
  });

  it("parses and formats month inputs without UTC timezone conversion", () => {
    expect(parseProfileMonthInput("2025-01")).toEqual({ year: 2025, month: 1 });
    expect(formatProfileMonthInput({ year: 2025, month: 1 })).toBe("2025-01");
  });

  it("rejects reversed, unsupported and non-integer periods", () => {
    expect(getProfileRangeError({ from: now, to: { year: 2026, month: 1 } }, now)).toBe("reversed");
    expect(getProfileRangeError({ from: { year: 2015, month: 10 }, to: now }, now)).toBe("unsupported");
    expect(getProfileRangeError({ from: now, to: { year: 2026, month: 3 } }, now)).toBe("unsupported");
    expect(getProfileRangeError({ from: { year: 2025, month: NaN }, to: now }, now)).toBe("invalid_month");
    expect(() => getProfileMonths({ from: now, to: { year: 2026, month: 1 } })).toThrow("reversed");
  });
});
