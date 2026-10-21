import {
  createReferenceResolver,
  InvalidTimelineError,
  type TimelineEntry,
} from "@shiftly/domain";
import { describe, expect, it } from "vitest";
import { monthlyTimelineProblem } from "../../src/reference-data/published-timelines.ts";

/**
 * The API validates published timelines with a mirror of the domain's
 * MonthlyTimeline (it cannot import @shiftly/domain at runtime). Every case
 * here runs through both, so they can never disagree about what is valid.
 */
const entry = (
  validFrom: string,
  validTo: string | null,
): TimelineEntry<number> => ({ validFrom, validTo, value: 1 });

const CASES: [string, TimelineEntry<number>[], boolean][] = [
  ["an empty timeline", [], true],
  ["one open value", [entry("2020-01-01", null)], true],
  [
    "contiguous values",
    [entry("2020-01-01", "2021-01-01"), entry("2021-01-01", null)],
    true,
  ],
  [
    "values in any order",
    [entry("2021-01-01", null), entry("2020-01-01", "2021-01-01")],
    true,
  ],
  [
    "a gap",
    [entry("2020-01-01", "2020-06-01"), entry("2020-09-01", null)],
    true,
  ],
  ["a closed last value", [entry("2020-01-01", "2021-01-01")], true],
  [
    "overlapping values",
    [entry("2020-01-01", "2021-01-01"), entry("2020-06-01", null)],
    false,
  ],
  [
    "two open values",
    [entry("2020-01-01", null), entry("2021-01-01", null)],
    false,
  ],
  ["a mid-month start", [entry("2020-01-15", null)], false],
  ["a mid-month end", [entry("2020-01-01", "2020-03-15")], false],
  ["an empty period", [entry("2020-01-01", "2020-01-01")], false],
  ["a reversed period", [entry("2020-03-01", "2020-01-01")], false],
  ["a month that does not exist", [entry("2020-13-01", null)], false],
  ["a day that does not exist", [entry("2020-02-30", null)], false],
  ["a malformed date", [entry("2020-1-01", null)], false],
  ["a malformed end", [entry("2020-01-01", "2021/01/01")], false],
];

describe("published timeline validation matches the domain", () => {
  it.each(CASES)("%s", (_, entries, valid) => {
    const apiAccepts = monthlyTimelineProblem(entries) === null;
    let domainAccepts = true;
    try {
      createReferenceResolver({
        perDiemPointRate: entries,
        mealAllowanceRates: [],
      });
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidTimelineError);
      domainAccepts = false;
    }

    expect(apiAccepts).toBe(valid);
    expect(domainAccepts).toBe(valid);
  });
});
