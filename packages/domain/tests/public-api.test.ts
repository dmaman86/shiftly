import { describe, expect, it } from "vitest";
import * as domain from "../src/index.js";

describe("domain public API", () => {
  it("exposes the composition root and supported calendar and credit operations", () => {
    expect(domain.buildPayMapPipeline).toBeTypeOf("function");
    expect(domain.allocateShabbatCredit).toBeTypeOf("function");
    expect(domain.DateService).toBeTypeOf("function");
  });
  it("exposes timeline reference resolution and the embedded baseline", () => {
    expect(domain.createReferenceResolver).toBeTypeOf("function");
    expect(domain.ReferenceValueUnavailableError).toBeTypeOf("function");
    expect(domain.InvalidTimelineError).toBeTypeOf("function");
    expect(domain.BASELINE_REFERENCE_TIMELINES).toBeTypeOf("object");
    expect(domain.SYSTEM_START_DATE).toBe("2015-11-01");
  });
  it("does not expose implementation-only pipelines or removed symbols", () => {
    for (const name of [
      "Mode",
      "RegularByMonthAccumulator",
      "BaseRegularCalculator",
      "DefaultShiftMapBuilder",
      "buildCoreServices",
      "buildResolvers",
      "MonthlyTimeline",
      "requireMonthValue",
    ])
      expect(domain).not.toHaveProperty(name);
  });
});
