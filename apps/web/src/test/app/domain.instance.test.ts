import { describe, expect, it } from "vitest";
import { domain } from "@/app/domain/domain.instance";

describe("web domain composition", () => {
  it("provides month selection and localized day labels outside the engine", () => {
    expect(domain.resolvers.monthResolver).toBeDefined();
    expect(
      domain.resolvers.monthResolver.getCurrentYear(),
    ).toBeGreaterThanOrEqual(2024);
    expect(domain.resolvers.dayInfoResolver.formatWorkDayLabel).toBeTypeOf(
      "function",
    );
  });
});
