import { describe, expect, it } from "vitest";
import * as domain from "@shiftly/domain";

describe("web domain import boundary", () => {
  it("uses the current source public API rather than a stale build", () => {
    expect(domain).not.toHaveProperty("Mode");
    expect(domain.buildPayMapPipeline).toBeTypeOf("function");
  });
});
