import { describe, expect, it } from "vitest";
import { appearsIn, percentAppearsIn } from "../../src/shared/grounding.ts";

describe("appearsIn", () => {
  it("ignores thousands separators but never matches inside a longer number", () => {
    const appears = appearsIn('עד 51,910 ₪ ו-7,703 ש"ח');
    expect(appears("51910")).toBe(true);
    expect(appears("7703")).toBe(true);
    expect(appears("1910")).toBe(false);
    expect(appears("770")).toBe(false);
  });
});

describe("percentAppearsIn", () => {
  it.each([
    ["4.27%", 0.0427],
    ["7.00%", 0.07],
    ["7%", 0.07],
    ["% 0.40", 0.004],
    ["% 12.00", 0.12],
  ])("finds %s as %d", (text, fraction) => {
    expect(percentAppearsIn(text)(fraction)).toBe(true);
  });

  it.each([
    ["17.00%", 0.07],
    ["4.27%", 0.0427 * 10],
    ["7.01%", 0.07],
    ["7.00 ₪", 0.07],
  ])("does not find %s as %d", (text, fraction) => {
    expect(percentAppearsIn(text)(fraction)).toBe(false);
  });
});
