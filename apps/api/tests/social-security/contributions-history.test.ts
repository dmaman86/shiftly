import { describe, expect, it } from "vitest";
import { RulesPipelineError } from "../../src/shared/errors.ts";
import {
  parseAnnualReportRates,
  parseEmployeeTotalHistory,
  parseThresholdHistory,
  validateAnnualReportRates,
  validateEmployeeTotalHistory,
  validateThresholdHistory,
} from "../../src/social-security/contributions-history.ts";
import {
  EMPLOYEE_TOTAL_HISTORY,
  REPORT_2018,
  REPORT_2019,
  THRESHOLD_HISTORY,
} from "./btl-fixtures.ts";

const problemsOf = (run: () => unknown): string[] => {
  try {
    run();
  } catch (error) {
    if (error instanceof RulesPipelineError) {
      return (error.details as { problems: string[] }).problems;
    }
    throw error;
  }
  return [];
};

describe("thresholds change-point table", () => {
  const read = (text = THRESHOLD_HISTORY) =>
    validateThresholdHistory(parseThresholdHistory(text), text);

  it("reads every row, newest first, with the employee maximum", () => {
    expect(
      read().rows.map((row) => [
        row.from,
        row.reducedRateBoundary,
        row.maxInsurableIncome,
      ]),
    ).toEqual([
      ["2025-02-01", 7522, 50695],
      ["2025-01-01", 7522, 50695],
      ["2024-04-01", 7522, 49030],
      ["2024-01-01", 7522, 49030],
      ["2023-01-01", 7122, 47465],
      ["2022-01-01", 6331, 45075],
      ["2020-01-01", 6331, 44020],
      ["2019-01-01", 6164, 43890],
      ["2018-01-01", 5944, 43370],
      ["2017-01-01", 5804, 43240],
      ["2016-07-01", 5678, 43240],
      ["2016-01-01", 5678, 43240],
      ["2015-04-01", 5556, 43240],
      ["2015-01-01", 5556, 43240],
      ["2014-01-01", 5453, 43240],
    ]);
  });

  it("keeps a row without numbers, so it still ends the row before it", () => {
    const text = THRESHOLD_HISTORY.replace(
      "01/01/2014 | 4,300 | 5,453 | 43,240 | 43,240 |",
      "01/01/2014 | 4,300 | 5,453 | אין מגבלה | אין מגבלה |",
    );
    expect(read(text).rows.at(-1)).toMatchObject({
      from: "2014-01-01",
      reducedRateBoundary: 5453,
      maxInsurableIncome: null,
    });
  });

  it("rejects a value that is not in its row", () => {
    const raw = parseThresholdHistory(THRESHOLD_HISTORY) as {
      rows: { reducedRateBoundary: number }[];
    };
    raw.rows[7].reducedRateBoundary = 6165;
    expect(
      problemsOf(() => validateThresholdHistory(raw, THRESHOLD_HISTORY)),
    ).toContain("row 2019-01-01: 6165 is not in its row");
  });

  it("reports a page without the table as unclear", () => {
    expect(() => read("דף אחר")).toThrowError(
      expect.objectContaining({ code: "extraction_unclear" }) as Error,
    );
  });
});

describe("employee totals change-point table", () => {
  it("reads the employee column of each part", () => {
    const history = validateEmployeeTotalHistory(
      parseEmployeeTotalHistory(EMPLOYEE_TOTAL_HISTORY),
      EMPLOYEE_TOTAL_HISTORY,
    );
    expect(
      history.rows.map((row) => [row.from, row.reduced, row.standard]),
    ).toEqual([
      ["2025-02-01", 0.0427, 0.1217],
      ["2025-01-01", 0.0427, 0.1216],
      ["2019-01-01", 0.035, 0.12],
      ["2016-01-01", 0.035, 0.12],
      ["2015-01-01", 0.035, 0.12],
      ["2014-01-01", 0.035, 0.12],
    ]);
  });
});

describe("yearly report", () => {
  it("reads 2018: health rates, and that rates stayed as in 2017", () => {
    expect(
      validateAnnualReportRates(
        parseAnnualReportRates(REPORT_2018),
        REPORT_2018,
        2018,
      ),
    ).toMatchObject({
      year: 2018,
      yearQuote: "בשנת 2018",
      statedFrom: null,
      sameAsYear: 2017,
      healthReduced: 0.031,
      healthStandard: 0.05,
      quote: "דמי ביטוח בריאות 5.00 3.10",
    });
  });

  it("reads 2019: the employee table, not the self-employed one", () => {
    expect(
      validateAnnualReportRates(
        parseAnnualReportRates(REPORT_2019),
        REPORT_2019,
        2019,
      ),
    ).toMatchObject({
      statedFrom: "2019-01-01",
      sameAsYear: null,
      healthReduced: 0.031,
      healthStandard: 0.05,
      quote: "3.10 5.00 ביטוח בריאות",
    });
  });

  it("rejects a report of another year", () => {
    expect(
      problemsOf(() =>
        validateAnnualReportRates(
          parseAnnualReportRates(REPORT_2018),
          REPORT_2018,
          2016,
        ),
      ),
    ).toContain("the report does not state the year 2016");
  });

  it("rejects a table that does not add up", () => {
    const text = REPORT_2018.replace("סך הכל 19.50 6.95", "סך הכל 19.60 6.95");
    expect(
      problemsOf(() =>
        validateAnnualReportRates(parseAnnualReportRates(text), text, 2018),
      ),
    ).toContain("the standard column does not add up");
  });
});
