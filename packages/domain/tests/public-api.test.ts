import { describe, expect, it } from "vitest";
import * as domain from "../src/index.js";

describe("domain public API", () => {
  it("exposes the composition root and supported calendar and credit operations", () => {
    expect(domain.buildPayMapPipeline).toBeTypeOf("function");
    expect(domain.allocateShabbatCredit).toBeTypeOf("function");
    expect(domain.DateService).toBeTypeOf("function");
  });
  it("does not expose implementation-only pipelines or removed symbols", () => {
    for (const name of [
      "Mode",
      "RegularByMonthAccumulator",
      "BaseRegularCalculator",
      "DefaultShiftMapBuilder",
      "buildCoreServices",
      "buildResolvers",
    ])
      expect(domain).not.toHaveProperty(name);
  });
});
