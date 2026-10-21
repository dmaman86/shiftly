import {
  createReferenceResolver,
  type ReferenceResolver,
  type ReferenceTimelines,
} from "./reference-resolver.js";

/**
 * The reference values shipped with the domain. Used only as the fallback
 * when published reference data is unavailable, as the deterministic default
 * for tests, and as the parity oracle. It is NOT the source of truth: the
 * published reference data (Supabase, through the API) is, and nothing seeds
 * production from this file.
 *
 * Values start at SYSTEM_START_DATE; earlier dates are out of range.
 */
export const BASELINE_REFERENCE_TIMELINES: ReferenceTimelines = {
  perDiemPointRate: [
    // Provisional historical dates: verify against the authoritative source.
    { validFrom: "2015-11-01", validTo: "2021-01-01", value: 29.5 },
    { validFrom: "2021-01-01", validTo: "2022-10-01", value: 31.6 },
    // Verified effective dates.
    { validFrom: "2022-10-01", validTo: "2024-09-01", value: 33.9 },
    { validFrom: "2024-09-01", validTo: null, value: 36.3 },
  ],
  mealAllowanceRates: [
    // Pre-July 2021 rates: verify the effective date and source.
    {
      validFrom: "2015-11-01",
      validTo: "2021-07-01",
      value: { small: 11.8, large: 17.1 },
    },
    {
      validFrom: "2021-07-01",
      validTo: "2022-10-01",
      value: { small: 12.6, large: 18.3 },
    },
    {
      validFrom: "2022-10-01",
      validTo: "2024-09-01",
      value: { small: 13.5, large: 19.7 },
    },
    {
      validFrom: "2024-09-01",
      validTo: null,
      value: { small: 14.5, large: 21.1 },
    },
  ],
};

export const BASELINE_REFERENCES: ReferenceResolver = createReferenceResolver(
  BASELINE_REFERENCE_TIMELINES,
);
