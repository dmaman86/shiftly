import { describe, expect, it } from "vitest";
import { validateIncomeTaxResearch } from "../../src/income-tax/research-validation.ts";
import {
  ANSWER_2026,
  BRACKET_ROWS,
  BRACKETS_2026,
  fetchedDocument,
} from "../research/booklet-fixtures.ts";

const validate = (raw: unknown, document = fetchedDocument(), year = 2026) =>
  validateIncomeTaxResearch(raw, document, year);

const withBrackets = (patch: object) => ({
  ...ANSWER_2026,
  monthlyBrackets: { ...ANSWER_2026.monthlyBrackets, ...patch },
});
const withCreditPoint = (patch: object) => ({
  ...ANSWER_2026,
  monthlyCreditPoint: { ...ANSWER_2026.monthlyCreditPoint, ...patch },
});

const problems = (...expected: string[]) =>
  expect.objectContaining({
    code: "invalid_extraction",
    details: { problems: expected },
  });

describe("validateIncomeTaxResearch", () => {
  it("accepts the 2026 booklet answer and quotes the fetched content", () => {
    const values = validate(ANSWER_2026);
    expect(values.monthlyBrackets).toMatchObject({
      value: BRACKETS_2026,
      effectiveFrom: "2026-01-01",
      sourceReference: "page 10",
      page: 10,
    });
    // The evidence is the passage as fetched, with its own spacing.
    expect(values.monthlyBrackets.quote).toBe(BRACKET_ROWS);
    expect(values.monthlyCreditPoint).toMatchObject({
      value: 242,
      quote: "נקודת זיכוי 33 א 242 לחודש",
      page: 12,
    });
  });

  it("stops when the extractor reports the document as unclear", () => {
    expect(() => validate({ ...ANSWER_2026, status: "unclear" })).toThrowError(
      expect.objectContaining({ code: "extraction_unclear" }),
    );
  });

  it("rejects a quote that is not in the fetched content", () => {
    expect(() =>
      validate(withCreditPoint({ quote: "נקודת זיכוי 33 א 249 לחודש" })),
    ).toThrowError(
      problems("monthlyCreditPoint: the quote is not in the fetched content"),
    );
  });

  it("rejects a quote too short to prove anything", () => {
    expect(() =>
      validate(withCreditPoint({ quote: "242 לחודש" })),
    ).toThrowError(
      problems("monthlyCreditPoint: the quote is not in the fetched content"),
    );
  });

  it("rejects a value that is not in its quote", () => {
    expect(() => validate(withCreditPoint({ value: 235 }))).toThrowError(
      problems("monthlyCreditPoint: 235 is not in its quote"),
    );
  });

  it("rejects a source reference to another page", () => {
    expect(() =>
      validate(withCreditPoint({ sourceReference: "page 11" })),
    ).toThrowError(
      problems(
        'monthlyCreditPoint: sourceReference "page 11" but the quote is on page 12',
      ),
    );
  });

  it("rejects a skipped row even though every number is in the table", () => {
    const merged = [
      ...BRACKETS_2026.slice(0, 2),
      { minIncome: 10061, maxIncome: 25100, taxRate: 0.31 },
      ...BRACKETS_2026.slice(4),
    ];
    expect(() => validate(withBrackets({ brackets: merged }))).toThrowError(
      problems(
        "bracket 2 (10061–25100 at 0.31) is not a row of its quote, in order",
      ),
    );
  });

  it("rejects the non-exertion table as implausible", () => {
    const nonExertion = [
      { minIncome: 0, maxIncome: 25100, taxRate: 0.31 },
      { minIncome: 25101, maxIncome: 46690, taxRate: 0.35 },
      { minIncome: 46691, maxIncome: null, taxRate: 0.47 },
    ];
    expect(() =>
      validate(withBrackets({ brackets: nonExertion })),
    ).toThrowError(
      problems("3 brackets is implausible", "first rate 0.31 is implausible"),
    );
  });

  it("rejects an effective date outside the requested year", () => {
    expect(() =>
      validate(withBrackets({ effectiveFrom: "2025-01-01" })),
    ).toThrowError(
      problems("monthlyBrackets: effectiveFrom 2025-01-01 is not in 2026"),
    );
  });

  it("rejects an effective date that does not exist", () => {
    expect(() =>
      validate(withCreditPoint({ effectiveFrom: "2026-02-30" })),
    ).toThrowError(
      problems("monthlyCreditPoint: effectiveFrom 2026-02-30 is not a date"),
    );
  });

  it("rejects a document that never names the requested year", () => {
    const document = fetchedDocument({
      text: fetchedDocument().text.replace("לשנת 2026", "לשנת המס"),
    });
    expect(() => validate(ANSWER_2026, document)).toThrowError(
      problems("the document never mentions 2026"),
    );
  });

  it("rejects fields the schema does not define", () => {
    expect(() => validate({ ...ANSWER_2026, surtaxRate: 0.03 })).toThrowError(
      expect.objectContaining({ code: "invalid_extraction" }),
    );
  });
});
