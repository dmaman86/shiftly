import { describe, expect, it } from "vitest";
import {
  validateBracketExtraction,
  validateCreditPointExtraction,
} from "../offline/income-tax/table-validation.ts";
import {
  bracketText,
  creditPointText,
  brackets2026,
  creditPointRows,
} from "./wikipedia-fixtures.ts";

const validateBrackets = (monthlyBrackets: unknown, status = "complete") =>
  validateBracketExtraction({ status, monthlyBrackets }, bracketText);

const validateCreditPoint = (rows: unknown, status = "complete") =>
  validateCreditPointExtraction({ status, rows }, creditPointText);

const withRow = <T extends object>(rows: T[], index: number, patch: object) =>
  rows.map((row, i) => (i === index ? { ...row, ...patch } : row));

const invalid = expect.objectContaining({ code: "invalid_extraction" });

describe("validateBracketExtraction", () => {
  it("preserves the old fixture's 50% row without defining the current research contract", () => {
    expect(validateBrackets(brackets2026)).toEqual(brackets2026);
  });

  it("stops when the extractor reports the table as unclear", () => {
    expect(() => validateBrackets(brackets2026, "unclear")).toThrow(
      expect.objectContaining({ code: "extraction_unclear" }),
    );
  });

  it.each([
    ["unknown fields", withRow(brackets2026, 0, { section: "x" })],
    ["percent instead of fraction", withRow(brackets2026, 0, { taxRate: 10 })],
    ["fractional limit", withRow(brackets2026, 0, { maxIncome: 7010.5 })],
    ["a single bracket", [brackets2026[0]]],
  ])("rejects %s", (_label, rows) => {
    expect(() => validateBrackets(rows)).toThrow(invalid);
  });

  it.each([
    ["a gap between brackets", withRow(brackets2026, 1, { minIncome: 7100 })],
    [
      "a first bracket not starting at 0",
      withRow(brackets2026, 0, { minIncome: 1 }),
    ],
    ["decreasing rates", withRow(brackets2026, 1, { taxRate: 0.05 })],
    [
      "an open-ended bracket before the last",
      withRow(brackets2026, 2, { maxIncome: null }),
    ],
  ])("rejects %s", (_label, rows) => {
    expect(() => validateBrackets(rows)).toThrow(invalid);
  });

  it("rejects a limit taken from the annual column", () => {
    const annual = withRow(brackets2026, 0, { maxIncome: 84120 });
    expect(() => validateBrackets(annual)).toThrow(invalid);
  });

  it("rejects a dropped row even when every remaining value exists in the table", () => {
    const dropped = [
      ...brackets2026.slice(0, 2),
      { ...brackets2026[3], minIncome: 10061 },
      ...brackets2026.slice(4),
    ];
    expect(() => validateBrackets(dropped)).toThrow(
      expect.objectContaining({
        details: {
          problems: ["6 brackets extracted but the table has 7 rows"],
        },
      }),
    );
  });
});

describe("validateCreditPointExtraction", () => {
  it("accepts every year of the table", () => {
    expect(validateCreditPoint(creditPointRows)).toEqual(creditPointRows);
  });

  it("rejects an added year that is not in the table", () => {
    const invented = [...creditPointRows, { year: 2026, monthlyValue: 242 }];
    expect(() => validateCreditPoint(invented)).toThrow(invalid);
  });

  it("rejects the annual value in place of the monthly one", () => {
    const annual = withRow(creditPointRows, 25, { monthlyValue: 2904 });
    expect(() => validateCreditPoint(annual)).toThrow(
      expect.objectContaining({
        details: {
          problems: ["row 25: monthly value 2904 is not in column 2"],
        },
      }),
    );
  });

  it("rejects rows out of table order", () => {
    const swapped = withRow(
      withRow(creditPointRows, 0, creditPointRows[1]),
      1,
      creditPointRows[0],
    );
    expect(() => validateCreditPoint(swapped)).toThrow(invalid);
  });

  it("stops when the extractor reports the table as unclear", () => {
    expect(() => validateCreditPoint(creditPointRows, "unclear")).toThrow(
      expect.objectContaining({ code: "extraction_unclear" }),
    );
  });
});
