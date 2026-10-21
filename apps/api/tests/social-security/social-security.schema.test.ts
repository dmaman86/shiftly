import { describe, expect, it } from "vitest";
import { validateEmployeeContributionsExtraction } from "../../src/social-security/social-security.schema.ts";
import {
  answer2020,
  answer2026,
  fakeKolZchutSource,
} from "./kolzchut-fixtures.ts";

const source = fakeKolZchutSource();
const text2026 = (
  await source.employeeContributionsAt(new Date("2026-07-01T00:00:00Z"))
).text;
const text2020 = (
  await source.employeeContributionsAt(new Date("2020-07-01T00:00:00Z"))
).text;

const validate = (raw: unknown, text = text2026) =>
  validateEmployeeContributionsExtraction(raw, text);

const invalid = expect.objectContaining({ code: "invalid_extraction" });

describe("validateEmployeeContributionsExtraction", () => {
  it("accepts the 2026 values and drops the stated totals", () => {
    expect(validate(answer2026)).toEqual({
      asOfYear: 2026,
      rules: {
        reducedRateCeiling: 7703,
        maxInsurableIncome: 51910,
        reducedRate: { nationalInsurance: 0.0104, health: 0.0323 },
        fullRate: { nationalInsurance: 0.07, health: 0.0517 },
      },
    });
  });

  it("accepts the 2020 values, written with trailing zeros", () => {
    expect(validate(answer2020, text2020).rules.reducedRate).toEqual({
      nationalInsurance: 0.004,
      health: 0.031,
    });
  });

  it("stops when the extractor reports the text as unclear", () => {
    expect(() => validate({ ...answer2026, status: "unclear" })).toThrowError(
      expect.objectContaining({ code: "extraction_unclear" }),
    );
  });

  it.each([
    [
      "percent instead of fraction",
      {
        reducedRate: { nationalInsurance: 1.04, health: 0.0323, total: 0.0427 },
      },
    ],
    ["a fractional amount", { reducedRateCeiling: 7703.5 }],
    ["unknown fields", { employerRate: 0.0451 }],
  ])("rejects %s", (_label, patch) => {
    expect(() => validate({ ...answer2026, ...patch })).toThrowError(invalid);
  });

  it("rejects parts that do not add up to the stated total", () => {
    const wrong = {
      ...answer2026,
      fullRate: { nationalInsurance: 0.07, health: 0.0516, total: 0.1217 },
    };
    expect(() => validate(wrong)).toThrowError(invalid);
  });

  it("rejects a value from another year", () => {
    expect(() =>
      validate({ ...answer2026, maxInsurableIncome: 50695 }),
    ).toThrowError(
      expect.objectContaining({
        details: {
          problems: ["maxInsurableIncome 50695 is not in the source"],
        },
      }),
    );
  });

  it("rejects the January-only health rate when the text states it only as a note", () => {
    const text = text2026.replace(
      "(החל מפברואר 2025)",
      "(בינואר 2025 בלבד 5.16%)",
    );
    const january = {
      ...answer2026,
      fullRate: { nationalInsurance: 0.07, health: 0.0516, total: 0.1216 },
    };
    // 12.16% is not in the text, so the totals no longer ground.
    expect(() => validate(january, text)).toThrowError(invalid);
  });

  it("rejects a ceiling that is not below the maximum", () => {
    expect(() =>
      validate({ ...answer2026, reducedRateCeiling: 51910 }),
    ).toThrowError(invalid);
  });
});
