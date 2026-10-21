import { describe, expect, it } from "vitest";
import { buildPayMapPipeline } from "../../src/composition.js";
import { SYSTEM_START_DATE } from "../../src/constants/system.constant.js";
import { BASELINE_REFERENCE_TIMELINES } from "../../src/reference/baseline.js";
import {
  createReferenceResolver,
  ReferenceValueUnavailableError,
  requireMonthValue,
  type ReferenceTimelines,
} from "../../src/reference/reference-resolver.js";
import { InvalidTimelineError } from "../../src/reference/timeline.js";

const PUBLISHED: ReferenceTimelines = {
  perDiemPointRate: [{ validFrom: "2015-11-01", validTo: null, value: 50 }],
  mealAllowanceRates: [
    {
      validFrom: "2015-11-01",
      validTo: "2030-01-01",
      value: { small: 1, large: 2 },
    },
  ],
};

describe("createReferenceResolver", () => {
  const references = createReferenceResolver(PUBLISHED);

  it("resolves each reference from its own timeline", () => {
    expect(references.resolve("perDiemPointRate", "2026-10-01")).toMatchObject({
      status: "resolved",
      value: 50,
    });
    expect(
      references.resolve("mealAllowanceRates", "2026-10-01"),
    ).toMatchObject({ status: "resolved", value: { small: 1, large: 2 } });
  });

  it("puts dates before SYSTEM_START_DATE out of range, whatever the data says", () => {
    const reachingBack = createReferenceResolver({
      ...PUBLISHED,
      perDiemPointRate: [{ validFrom: "2000-01-01", validTo: null, value: 9 }],
    });

    expect(SYSTEM_START_DATE).toBe("2015-11-01");
    expect(reachingBack.resolve("perDiemPointRate", "2015-10-31")).toEqual({
      status: "unavailable",
      reason: "out_of_range",
    });
    expect(
      reachingBack.resolve("perDiemPointRate", "2015-11-01"),
    ).toMatchObject({ status: "resolved", value: 9 });
  });

  it("reports supported dates without data as not covered", () => {
    expect(references.resolve("mealAllowanceRates", "2030-01-01")).toEqual({
      status: "unavailable",
      reason: "not_covered",
    });
  });

  it("fails when built from an invalid timeline, not while calculating", () => {
    expect(() =>
      createReferenceResolver({
        ...PUBLISHED,
        perDiemPointRate: [
          { validFrom: "2020-01-01", validTo: null, value: 1 },
          { validFrom: "2021-01-01", validTo: null, value: 2 },
        ],
      }),
    ).toThrow(InvalidTimelineError);
  });
});

describe("requireMonthValue", () => {
  const references = createReferenceResolver(PUBLISHED);

  it("returns the value that applies on the first day of the month", () => {
    expect(
      requireMonthValue(references, "perDiemPointRate", {
        year: 2026,
        month: 10,
      }),
    ).toBe(50);
  });

  it("throws instead of handing a zero rate to the pay rules", () => {
    expect(() =>
      requireMonthValue(references, "mealAllowanceRates", {
        year: 2030,
        month: 1,
      }),
    ).toThrow(
      new ReferenceValueUnavailableError(
        "mealAllowanceRates",
        "2030-01-01",
        "not_covered",
      ),
    );
  });
});

describe("buildPayMapPipeline", () => {
  it("uses the embedded baseline by default", () => {
    const { rateCalculators } = buildPayMapPipeline();

    expect(
      rateCalculators.perDiem.calculateRate({ year: 2026, month: 10 }),
    ).toBe(36.3);
  });

  it("calculates with the reference values it is given", () => {
    const { rateCalculators } = buildPayMapPipeline({
      referenceResolver: createReferenceResolver(PUBLISHED),
    });

    expect(
      rateCalculators.perDiem.calculateRate({ year: 2026, month: 10 }),
    ).toBe(50);
    expect(
      rateCalculators.mealAllowanceRate.calculateRates({
        year: 2026,
        month: 10,
      }),
    ).toEqual({ small: 1, large: 2 });
  });

  it("keeps the baseline as plain timeline data, without provenance", () => {
    for (const timeline of Object.values(BASELINE_REFERENCE_TIMELINES)) {
      for (const entry of timeline) {
        expect(Object.keys(entry).sort()).toEqual([
          "validFrom",
          "validTo",
          "value",
        ]);
      }
    }
  });
});
