import { describe, expect, it } from "vitest";
import { buildPayMapPipeline, WorkDayType } from "@shiftly/domain";

describe("compiled domain public API", () => {
  it("loads and calculates without browser globals", () => {
    expect("window" in globalThis).toBe(false);
    expect("document" in globalThis).toBe(false);
    const pipeline = buildPayMapPipeline();
    const days = pipeline.payMap.workDaysForMonthBuilder.build({
      year: 2026,
      month: 8,
      eventMap: {},
    });
    expect(days).toHaveLength(31);
    expect(days[0].meta.typeDay).toBe(WorkDayType.SpecialFull);
    expect(pipeline.resolvers).not.toHaveProperty("monthResolver");
    expect(pipeline.resolvers.workDayInfoResolver).not.toHaveProperty("formatWorkDayLabel");
  });
});
