import { describe, expect, it } from "vitest";

import { calculateActualHours, formatValue } from "@/utils";

describe("formatValue", () => {
  it("does not render floating-point noise as negative zero", () => {
    expect(formatValue(-0.0000001)).toBe("");
    expect(formatValue(0)).toBe("");
  });

  it("rounds currency values consistently at half-cent boundaries", () => {
    expect(formatValue(803.8549999999999)).toBe("803.86");
  });

  it("formats floating-point multiplication without exposing representation noise", () => {
    expect(formatValue(36.3 * 3)).toBe("108.90");
    expect(formatValue(1.005)).toBe("1.01");
    expect(formatValue(-1.005)).toBe("-1.01");
  });

  it("makes final-total rounding distinct from rounding each component", () => {
    const amount = 0.004;
    expect(formatValue(amount)).toBe("");
    expect(formatValue(amount + amount)).toBe("0.01");
  });
});

describe("calculateActualHours", () => {
  it("excludes sick and vacation hours from total hours", () => {
    expect(calculateActualHours(40, 8, 4)).toBe(28);
  });

  it("does not return negative hours for inconsistent input", () => {
    expect(calculateActualHours(6, 8, 0)).toBe(0);
  });
});
