import { describe, expect, it } from "vitest";
import { ExtraCalculator } from "../../../src/calculator/extra/extra.calculator.js";
import { getAdditionGroups } from "../../../src/calculator/additions/addition-groups.js";

describe("ExtraCalculator rate groups", () => {
  const calculator = new ExtraCalculator();

  const makeMixedRates = () => ({
    ...calculator.createEmpty(),
    hours20: { percent: 0.2, hours: 2 },
    "evening:0.3": { percent: 0.3, hours: 2 },
    "night:0.3": { percent: 0.3, hours: 1 },
  });

  it("accumulates only matching kind and percentage without mutating inputs", () => {
    const base = makeMixedRates();
    const add = {
      ...calculator.createEmpty(),
      "evening:0.3": { percent: 0.3, hours: 2 },
    };
    const result = calculator.accumulate(base, add);

    expect(result.hours20).toEqual({ percent: 0.2, hours: 2 });
    expect(result["evening:0.3"]).toEqual({ percent: 0.3, hours: 4 });
    expect(result["night:0.3"]).toEqual({ percent: 0.3, hours: 1 });
    expect(base["evening:0.3"].hours).toBe(2);
    expect(add["evening:0.3"].hours).toBe(2);
  });

  it("normalizes legacy input by its actual percentage without losing pay", () => {
    const result = calculator.accumulate(calculator.createEmpty(), {
      ...calculator.createEmpty(),
      hours20: { percent: 0.3, hours: 4 },
    });

    expect(result.hours20.hours).toBe(0);
    expect(result["evening:0.3"]).toEqual({ percent: 0.3, hours: 4 });
  });

  it("rejects unknown group kinds instead of silently counting them as night", () => {
    expect(() =>
      getAdditionGroups(
        Object.assign(calculator.createEmpty(), {
          unknown: { percent: 0.2, hours: 1 },
        }),
      ),
    ).toThrow('Unknown addition group: "unknown"');
  });
});
