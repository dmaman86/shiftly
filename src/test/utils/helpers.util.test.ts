import { describe, expect, it } from "vitest";

import { calculateActualHours } from "@/utils";

describe("calculateActualHours", () => {
  it("excludes sick and vacation hours from total hours", () => {
    expect(calculateActualHours(40, 8, 4)).toBe(28);
  });

  it("does not return negative hours for inconsistent input", () => {
    expect(calculateActualHours(6, 8, 0)).toBe(0);
  });
});
