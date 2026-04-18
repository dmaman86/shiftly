import { describe, it, expect } from "vitest";
import { buildEventMap } from "@/adapters/event.adapter";

describe("buildEventMap", () => {
  describe("basic grouping", () => {
    it("should return empty map for empty input", () => {
      expect(buildEventMap([])).toEqual({});
    });

    it("should group a single event by date", () => {
      const result = buildEventMap([
        { date: "2024-09-14T00:00:00", title: "Rosh Hashana" },
      ]);

      expect(result["2024-09-14"]).toEqual(["Rosh Hashana"]);
    });

    it("should strip time portion from datetime string", () => {
      const result = buildEventMap([
        { date: "2024-04-23T12:30:00+03:00", title: "Pesach I" },
      ]);

      expect(result["2024-04-23"]).toEqual(["Pesach I"]);
    });

    it("should group multiple events on the same date into one array", () => {
      const result = buildEventMap([
        { date: "2024-09-14T00:00:00", title: "Rosh Hashana" },
        { date: "2024-09-14T00:00:00", title: "Yom Tov" },
      ]);

      expect(result["2024-09-14"]).toHaveLength(2);
      expect(result["2024-09-14"]).toContain("Rosh Hashana");
      expect(result["2024-09-14"]).toContain("Yom Tov");
    });

    it("should keep events on different dates separate", () => {
      const result = buildEventMap([
        { date: "2024-09-14T00:00:00", title: "Rosh Hashana" },
        { date: "2024-09-15T00:00:00", title: "Rosh Hashana II" },
      ]);

      expect(result["2024-09-14"]).toEqual(["Rosh Hashana"]);
      expect(result["2024-09-15"]).toEqual(["Rosh Hashana II"]);
    });
  });

  describe("title normalization", () => {
    it("should replace left single quotation mark (\\u2018) with ASCII apostrophe", () => {
      const result = buildEventMap([
        { date: "2024-01-01T00:00:00", title: "Yom Ha\u2018Atzmaut" },
      ]);

      expect(result["2024-01-01"][0]).toBe("Yom Ha'Atzmaut");
    });

    it("should replace right single quotation mark (\\u2019) with ASCII apostrophe", () => {
      const result = buildEventMap([
        { date: "2024-01-01T00:00:00", title: "Yom Ha\u2019Atzmaut" },
      ]);

      expect(result["2024-01-01"][0]).toBe("Yom Ha'Atzmaut");
    });

    it("should replace modifier letter apostrophe (\\u02BC) with ASCII apostrophe", () => {
      const result = buildEventMap([
        { date: "2024-05-14T00:00:00", title: "Yom Ha\u02BCAtzmaut" },
      ]);

      expect(result["2024-05-14"][0]).toBe("Yom Ha'Atzmaut");
    });

    it("should replace all occurrences in a single title", () => {
      const result = buildEventMap([
        { date: "2024-01-01T00:00:00", title: "A\u2018B\u2019C\u02BCD" },
      ]);

      expect(result["2024-01-01"][0]).toBe("A'B'C'D");
    });

    it("should leave titles without special apostrophes unchanged", () => {
      const result = buildEventMap([
        { date: "2024-09-14T00:00:00", title: "Rosh Hashana" },
      ]);

      expect(result["2024-09-14"][0]).toBe("Rosh Hashana");
    });
  });
});
