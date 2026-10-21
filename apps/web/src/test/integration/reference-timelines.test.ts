import { describe, expect, it } from "vitest";
import {
  BASELINE_REFERENCE_TIMELINES,
  createReferenceResolver,
  ReferenceValueUnavailableError,
} from "@shiftly/domain";
import { createDomainContext, domain as baselineDomain } from "@/app";
import { toReferenceTimelines } from "@/adapters/referenceTimelines.adapter";
import type { PublishedTimelines } from "@/services";

/** The baseline, as the API would publish it. */
const PUBLISHED_BASELINE: PublishedTimelines = {
  "per_diem.point_rate": BASELINE_REFERENCE_TIMELINES.perDiemPointRate.map(
    ({ validFrom, validTo, value }) => ({
      validFrom,
      validTo,
      value: { amount: value },
    }),
  ),
  "meal_allowance.rates": BASELINE_REFERENCE_TIMELINES.mealAllowanceRates.map(
    (entry) => ({ ...entry, value: { ...entry.value } }),
  ),
};

const domainFrom = (published: PublishedTimelines) =>
  createDomainContext({
    resolver: createReferenceResolver(toReferenceTimelines(published)),
    version: "published",
  });

const supportedMonths = Array.from(
  { length: (2040 - 2015) * 12 + 2 },
  (_, i) => {
    const index = i + 10; // November 2015
    return { year: 2015 + Math.floor(index / 12), month: (index % 12) + 1 };
  },
);

describe("published timelines in the calculation", () => {
  it("map the API shape onto the domain timelines", () => {
    expect(toReferenceTimelines(PUBLISHED_BASELINE)).toEqual(
      BASELINE_REFERENCE_TIMELINES,
    );
  });

  it("calculate exactly like the baseline when the values are the same", () => {
    const published = domainFrom(PUBLISHED_BASELINE);

    for (const period of supportedMonths) {
      expect(published.resolvers.perDiemResolver.calculateRate(period)).toBe(
        baselineDomain.resolvers.perDiemResolver.calculateRate(period),
      );
      expect(
        published.resolvers.mealAllowanceRateResolver.calculateRates(period),
      ).toEqual(
        baselineDomain.resolvers.mealAllowanceRateResolver.calculateRates(
          period,
        ),
      );
      expect(
        published.references.monthIssues(period.year, period.month),
      ).toEqual([]);
    }
  });

  it("keep a month without coverage unavailable, never zero", () => {
    const withGap = domainFrom({
      ...PUBLISHED_BASELINE,
      "per_diem.point_rate": [
        {
          validFrom: "2015-11-01",
          validTo: "2024-01-01",
          value: { amount: 1 },
        },
        { validFrom: "2025-01-01", validTo: null, value: { amount: 2 } },
      ],
    });

    expect(withGap.references.monthIssues(2024, 6)).toEqual([
      { key: "perDiemPointRate", on: "2024-06-01", reason: "not_covered" },
    ]);
    expect(() =>
      withGap.resolvers.perDiemResolver.calculateRate({ year: 2024, month: 6 }),
    ).toThrow(ReferenceValueUnavailableError);
    expect(withGap.references.monthIssues(2025, 6)).toEqual([]);
  });

  it("report months before the supported period as out of range", () => {
    expect(baselineDomain.references.monthIssues(2015, 10)).toEqual([
      { key: "perDiemPointRate", on: "2015-10-01", reason: "out_of_range" },
      { key: "mealAllowanceRates", on: "2015-10-01", reason: "out_of_range" },
    ]);
  });
});
