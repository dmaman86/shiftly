import { describe, expect, it } from "vitest";
import {
  dateFromStatement,
  parseBtlEmployeeRates,
  parseKolZchutDeductions,
} from "../offline/social-security/contributions-extraction.ts";
import { validateContributionsExtraction } from "../offline/social-security/contributions-validation.ts";
import { BTL_2015, BTL_2025_FEBRUARY, BTL_LIVE } from "./btl-fixtures.ts";
import { kolZchutSection } from "./kolzchut-fixtures.ts";

/** Each parameter as [value, statedFrom, statedUntil]. */
const read = (text: string, parse = parseBtlEmployeeRates) =>
  Object.fromEntries(
    Object.entries(
      validateContributionsExtraction(parse(text), text).claims,
    ).map(([parameter, claim]) => [
      parameter,
      [claim.value, claim.statedFrom, claim.statedUntil],
    ]),
  );

describe("dateFromStatement", () => {
  it.each([
    ["(החל ב- 01.02.2025)", "2025-02-01"],
    ["מעודכן ל- 01.01.2015", "2015-01-01"],
    ["(החל מפברואר 2025)", "2025-02-01"],
    ["נכון ל-2026", "2026-01-01"],
    ["31.02.2025", null],
    ["ללא תאריך", null],
  ])("reads %s as %s", (text, date) => {
    expect(dateFromStatement(text)).toBe(date);
  });
});

describe("parseBtlEmployeeRates", () => {
  it("reads a 2015 capture, dated by the table heading", () => {
    expect(read(BTL_2015)).toEqual({
      reducedRateBoundary: [5556, "2015-01-01", null],
      maxInsurableIncome: [43240, "2015-01-01", null],
      nationalInsuranceReducedRate: [0.004, "2015-01-01", null],
      nationalInsuranceStandardRate: [0.07, "2015-01-01", null],
      healthInsuranceReducedRate: [0.031, "2015-01-01", null],
      healthInsuranceStandardRate: [0.05, "2015-01-01", null],
    });
  });

  it("reads each cell's own start date", () => {
    expect(read(BTL_2025_FEBRUARY)).toEqual({
      reducedRateBoundary: [7522, "2024-01-01", null],
      maxInsurableIncome: [50695, "2025-01-01", null],
      nationalInsuranceReducedRate: [0.0104, "2025-01-01", null],
      nationalInsuranceStandardRate: [0.07, "2006-01-01", null],
      healthInsuranceReducedRate: [0.0323, "2025-01-01", null],
      healthInsuranceStandardRate: [0.0517, "2025-02-01", null],
    });
  });

  it("reads the live page", () => {
    expect(read(BTL_LIVE)).toEqual({
      reducedRateBoundary: [7703, "2026-01-01", null],
      maxInsurableIncome: [51910, "2026-01-01", null],
      nationalInsuranceReducedRate: [0.0104, "2025-01-01", null],
      nationalInsuranceStandardRate: [0.07, "2006-01-01", null],
      healthInsuranceReducedRate: [0.0323, "2025-01-01", null],
      healthInsuranceStandardRate: [0.0517, "2025-02-01", null],
    });
  });

  it("keeps the page's statement that the maximum changes in January", () => {
    const raw = parseBtlEmployeeRates(BTL_LIVE);
    expect(raw.status === "complete" && raw.annualMaxUpdate).toMatch(
      /^ההכנסה המרבית מתעדכנת.*בינואר כל שנה$/,
    );
  });

  it("reports a page without the table as unclear", () => {
    expect(parseBtlEmployeeRates("דף שגיאה")).toEqual({
      status: "unclear",
      problems: ["the employee rates table is missing"],
    });
  });

  it("reports a cell that is not a rate instead of guessing", () => {
    const raw = parseBtlEmployeeRates(BTL_LIVE.replace("1.04%", "ראו הערה"));
    expect(raw.status).toBe("unclear");
  });
});

describe("parseKolZchutDeductions", () => {
  it("reads the 2020 section; a 'correct for 2020' amount holds for 2020 only", () => {
    expect(read(kolZchutSection(2020), parseKolZchutDeductions)).toEqual({
      reducedRateBoundary: [6331, "2020-01-01", "2021-01-01"],
      maxInsurableIncome: [44020, "2020-01-01", "2021-01-01"],
      nationalInsuranceReducedRate: [0.004, "2006-01-01", null],
      nationalInsuranceStandardRate: [0.07, "2006-01-01", null],
      healthInsuranceReducedRate: [0.031, "1995-01-01", null],
      healthInsuranceStandardRate: [0.05, "2006-01-01", null],
    });
  });

  it("reads the 2026 section, leaving undated values undated", () => {
    expect(read(kolZchutSection(2026), parseKolZchutDeductions)).toEqual({
      reducedRateBoundary: [7703, "2026-01-01", "2027-01-01"],
      maxInsurableIncome: [51910, null, null],
      nationalInsuranceReducedRate: [0.0104, null, null],
      nationalInsuranceStandardRate: [0.07, null, null],
      healthInsuranceReducedRate: [0.0323, null, null],
      healthInsuranceStandardRate: [0.0517, "2025-02-01", null],
    });
  });
});
