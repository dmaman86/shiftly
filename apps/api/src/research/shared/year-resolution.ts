/** A value published for a span of tax years (a single year has fromYear === toYear). */
export type YearlyValue<T> = {
  readonly fromYear: number;
  readonly toYear: number;
  readonly value: T;
};

export type YearResolution<T> = {
  readonly value: T;
  /** The year the source published the value for. */
  readonly effectiveYear: number;
  /** True when the source has nothing for the requested year and an earlier value is reused. */
  readonly carriedForward: boolean;
};

/**
 * The value that covers `year`, or else the latest one published before it.
 * shiftly is indicative, so a missing year reuses the last known value and
 * says so; this is decided here, never by the model. Returns null when the
 * source has nothing for `year` or any earlier year.
 */
export function resolveForYear<T>(
  values: readonly YearlyValue<T>[],
  year: number,
): YearResolution<T> | null {
  const covering = values.find(
    (entry) => entry.fromYear <= year && year <= entry.toYear,
  );
  if (covering) {
    return {
      value: covering.value,
      effectiveYear: year,
      carriedForward: false,
    };
  }

  const earlier = values
    .filter((entry) => entry.toYear < year)
    .sort((a, b) => b.toYear - a.toYear)[0];
  if (!earlier) return null;
  return {
    value: earlier.value,
    effectiveYear: earlier.toYear,
    carriedForward: true,
  };
}
