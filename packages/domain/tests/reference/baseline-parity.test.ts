import { describe, expect, it } from "vitest";
import { BASELINE_REFERENCES } from "../../src/reference/baseline.js";
import { monthStart } from "../../src/reference/timeline.js";
import type { MealAllowanceRates } from "../../src/types/types.js";

/**
 * Frozen copy of the timelines and lookup the calculators used before the
 * ReferenceResolver (packages/domain, October 2026). The baseline must give
 * the same value for every supported month; the only intended difference is
 * before SYSTEM_START_DATE, where the old lookup returned a zero per-diem
 * rate (and meal allowance rates from 2000) and the baseline is out of range.
 */
const LEGACY_PER_DIEM = [
  { year: 2015, month: 11, rate: 29.5 },
  { year: 2021, month: 1, rate: 31.6 },
  { year: 2022, month: 10, rate: 33.9 },
  { year: 2024, month: 9, rate: 36.3 },
];
const LEGACY_MEAL_ALLOWANCE: {
  year: number;
  month: number;
  rates: MealAllowanceRates;
}[] = [
  { year: 2000, month: 1, rates: { small: 11.8, large: 17.1 } },
  { year: 2021, month: 7, rates: { small: 12.6, large: 18.3 } },
  { year: 2022, month: 10, rates: { small: 13.5, large: 19.7 } },
  { year: 2024, month: 9, rates: { small: 14.5, large: 21.1 } },
];

function legacyLookup<T extends { year: number; month: number }>(
  timeline: readonly T[],
  year: number,
  month: number,
): T | undefined {
  return timeline
    .filter(
      (entry) =>
        entry.year < year || (entry.year === year && entry.month <= month),
    )
    .sort((a, b) =>
      a.year !== b.year ? b.year - a.year : b.month - a.month,
    )[0];
}

const FIRST_YEAR = 2015;
const LAST_YEAR = 2040;
const months = Array.from(
  { length: (LAST_YEAR - FIRST_YEAR + 1) * 12 },
  (_, index) => ({
    year: FIRST_YEAR + Math.floor(index / 12),
    month: (index % 12) + 1,
  }),
);
const isSupported = ({ year, month }: { year: number; month: number }) =>
  year > 2015 || month >= 11;

describe("baseline parity with the legacy calculator timelines", () => {
  it.each(months.filter(isSupported))(
    "$year-$month resolves the legacy rates",
    ({ year, month }) => {
      const on = monthStart(year, month);

      expect(BASELINE_REFERENCES.resolve("perDiemPointRate", on)).toMatchObject(
        {
          status: "resolved",
          value: legacyLookup(LEGACY_PER_DIEM, year, month)?.rate,
        },
      );
      expect(
        BASELINE_REFERENCES.resolve("mealAllowanceRates", on),
      ).toMatchObject({
        status: "resolved",
        value: legacyLookup(LEGACY_MEAL_ALLOWANCE, year, month)?.rates,
      });
    },
  );

  it("differs only before November 2015, where it is out of range instead of zero", () => {
    const unsupported = months.filter((month) => !isSupported(month));

    expect(unsupported.map(({ month }) => month)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
    for (const { year, month } of unsupported) {
      const on = monthStart(year, month);
      expect(legacyLookup(LEGACY_PER_DIEM, year, month)).toBeUndefined();
      expect(BASELINE_REFERENCES.resolve("perDiemPointRate", on)).toEqual({
        status: "unavailable",
        reason: "out_of_range",
      });
      expect(BASELINE_REFERENCES.resolve("mealAllowanceRates", on)).toEqual({
        status: "unavailable",
        reason: "out_of_range",
      });
    }
  });
});
