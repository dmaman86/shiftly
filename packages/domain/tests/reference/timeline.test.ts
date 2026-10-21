import { describe, expect, it } from "vitest";
import {
  InvalidTimelineError,
  MonthlyTimeline,
  type TimelineEntry,
} from "../../src/reference/timeline.js";

const entry = (
  validFrom: string,
  validTo: string | null,
  value: number,
): TimelineEntry<number> => ({ validFrom, validTo, value });

const build = (...entries: TimelineEntry<number>[]) =>
  new MonthlyTimeline("rate", entries);

describe("MonthlyTimeline", () => {
  describe("resolution", () => {
    const timeline = build(
      entry("2020-01-01", "2021-01-01", 10),
      entry("2021-01-01", null, 20),
    );

    it("includes validFrom and excludes validTo", () => {
      expect(timeline.resolve("2020-01-01")).toEqual({
        status: "resolved",
        value: 10,
        validFrom: "2020-01-01",
        validTo: "2021-01-01",
      });
      expect(timeline.resolve("2020-12-31")).toMatchObject({ value: 10 });
      expect(timeline.resolve("2021-01-01")).toMatchObject({ value: 20 });
    });

    it("keeps an open-ended value until further notice", () => {
      expect(timeline.resolve("2040-06-15")).toMatchObject({
        status: "resolved",
        value: 20,
        validTo: null,
      });
    });

    it("reports dates before the first value as not covered", () => {
      expect(timeline.resolve("2019-12-31")).toEqual({
        status: "unavailable",
        reason: "not_covered",
      });
    });

    it("reports a gap as not covered, never the previous value", () => {
      const withGap = build(
        entry("2020-01-01", "2020-06-01", 10),
        entry("2020-09-01", null, 20),
      );

      expect(withGap.resolve("2020-07-15")).toEqual({
        status: "unavailable",
        reason: "not_covered",
      });
      expect(withGap.resolve("2020-09-01")).toMatchObject({ value: 20 });
    });

    it("reports dates after a closed last value as not covered", () => {
      const closed = build(entry("2020-01-01", "2021-01-01", 10));

      expect(closed.resolve("2021-01-01")).toMatchObject({
        status: "unavailable",
        reason: "not_covered",
      });
    });

    it("does not depend on the order entries arrive in", () => {
      const reversed = build(
        entry("2021-01-01", null, 20),
        entry("2020-01-01", "2021-01-01", 10),
      );

      expect(reversed.resolve("2020-05-01")).toMatchObject({ value: 10 });
      expect(reversed.resolve("2022-05-01")).toMatchObject({ value: 20 });
    });

    it("treats an empty timeline as covering nothing", () => {
      expect(build().resolve("2020-01-01")).toMatchObject({
        reason: "not_covered",
      });
    });

    it.each(["2020-02-30", "2020-1-01", "01/01/2020"])(
      "rejects the lookup date %s",
      (date) => {
        expect(() => timeline.resolve(date)).toThrow(RangeError);
      },
    );
  });

  describe("validation when built", () => {
    it.each<[string, TimelineEntry<number>[], RegExp]>([
      [
        "overlapping values",
        [entry("2020-01-01", "2021-01-01", 10), entry("2020-06-01", null, 20)],
        /overlaps the entry from 2020-06-01/,
      ],
      [
        "an open value followed by another",
        [entry("2020-01-01", null, 10), entry("2021-01-01", null, 20)],
        /has no end but 2021-01-01 starts after it/,
      ],
      [
        "a value starting mid-month",
        [entry("2020-01-15", null, 10)],
        /must start on the first day of a month/,
      ],
      [
        "a value ending mid-month",
        [entry("2020-01-01", "2020-03-15", 10)],
        /must end on the first day of a month/,
      ],
      [
        "an empty period",
        [entry("2020-01-01", "2020-01-01", 10)],
        /validTo is not after validFrom/,
      ],
      [
        "a date that does not exist",
        [entry("2020-13-01", null, 10)],
        /validFrom is not a date/,
      ],
    ])("rejects %s", (_, entries, message) => {
      expect(() => build(...entries)).toThrow(InvalidTimelineError);
      expect(() => build(...entries)).toThrow(message);
    });
  });
});
