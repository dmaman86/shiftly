import type { ReferenceTimelines } from "@shiftly/domain";
import type { PublishedTimelines } from "@/services/reference/reference.service";

/**
 * Maps the published DTO to the domain timelines: kinds become domain keys
 * and values the shapes the pay rules use. Periods pass through untouched;
 * whether they form valid timelines is decided by createReferenceResolver.
 */
export const toReferenceTimelines = (
  published: PublishedTimelines,
): ReferenceTimelines => ({
  perDiemPointRate: published["per_diem.point_rate"].map(
    ({ validFrom, validTo, value }) => ({
      validFrom,
      validTo,
      value: value.amount,
    }),
  ),
  mealAllowanceRates: published["meal_allowance.rates"].map(
    ({ validFrom, validTo, value }) => ({
      validFrom,
      validTo,
      value: { small: value.small, large: value.large },
    }),
  ),
});
