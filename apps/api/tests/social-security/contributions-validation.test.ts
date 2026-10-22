import { describe, expect, it } from "vitest";
import { RulesPipelineError } from "../../src/shared/errors.ts";
import { parseBtlEmployeeRates } from "../../src/social-security/contributions-extraction.ts";
import { validateContributionsExtraction } from "../../src/social-security/contributions-validation.ts";
import { BTL_2025_FEBRUARY, BTL_LIVE } from "./btl-fixtures.ts";

const complete = (text = BTL_LIVE) => {
  const raw = parseBtlEmployeeRates(text);
  if (raw.status !== "complete") throw new Error("fixture must parse");
  return raw;
};

const problemsOf = (raw: unknown, text = BTL_LIVE): string[] => {
  try {
    validateContributionsExtraction(raw, text);
  } catch (error) {
    if (error instanceof RulesPipelineError) {
      return (error.details as { problems: string[] }).problems;
    }
    throw error;
  }
  return [];
};

const withClaim = (
  parameter: keyof ReturnType<typeof complete>["parameters"],
  patch: object,
) => {
  const raw = complete();
  return {
    ...raw,
    parameters: {
      ...raw.parameters,
      [parameter]: { ...raw.parameters[parameter], ...patch },
    },
  };
};

describe("validateContributionsExtraction", () => {
  it("rejects an unclear reading", () => {
    expect(() =>
      validateContributionsExtraction(
        { status: "unclear", problems: ["no table"] },
        BTL_LIVE,
      ),
    ).toThrowError(
      expect.objectContaining({ code: "extraction_unclear" }) as Error,
    );
  });

  it("rejects a value that is not in its quote", () => {
    expect(
      problemsOf(withClaim("maxInsurableIncome", { value: 51911 })),
    ).toContain("maxInsurableIncome 51911 is not in the source");
  });

  it("rejects a quote that is not in the text", () => {
    expect(
      problemsOf(
        withClaim("healthInsuranceStandardRate", {
          quote: "דמי ביטוח בריאות | - | % 5.17 |",
          value: 0.0517,
        }),
      ),
    ).toContain("healthInsuranceStandardRate 0.0517 is not in the source");
  });

  it("rejects a start date the source does not state", () => {
    expect(
      problemsOf(
        withClaim("healthInsuranceStandardRate", { statedFrom: "2025-01-01" }),
      ),
    ).toContain(
      "healthInsuranceStandardRate: start date 2025-01-01 is not in the source",
    );
  });

  it("rejects an end date the source does not state", () => {
    expect(
      problemsOf(
        withClaim("reducedRateBoundary", { statedUntil: "2027-01-01" }),
      ),
    ).toContain(
      "reducedRateBoundary: end date 2027-01-01 is not in the source",
    );
  });

  it("rejects out-of-range values", () => {
    expect(
      problemsOf(withClaim("nationalInsuranceReducedRate", { value: 1.04 })),
    ).toContain("nationalInsuranceReducedRate 1.04 is out of range");
  });

  it("rejects a boundary at or above the maximum", () => {
    const raw = complete(BTL_LIVE.replace("51,910", "7,703"));
    expect(problemsOf(raw, BTL_LIVE.replace("51,910", "7,703"))).toContain(
      "reducedRateBoundary must be below maxInsurableIncome",
    );
  });

  it("rejects parts that do not add up to a total of the same period", () => {
    const text = BTL_LIVE.replace("12.17%", "12.18%");
    expect(problemsOf(complete(text), text)).toContain(
      "standard: national insurance + health must equal the stated total",
    );
  });

  // The February 2025 capture states 12.16% "from 01.01.2025" next to a
  // health rate of 5.17% "from 01.02.2025": a total of an earlier month, not
  // a contradiction, and no evidence for that month's health rate either.
  it("does not compare a total with parts of another period", () => {
    expect(problemsOf(complete(BTL_2025_FEBRUARY), BTL_2025_FEBRUARY)).toEqual(
      [],
    );
  });
});
