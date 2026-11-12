import { readFileSync } from "node:fs";
import { joinRowCells, stripNoinclude } from "../offline/shared/wikitext.ts";

/** Recorded fixture bytes only; no MediaWiki client, URL fetching or year fallback. */
const fixture = (name: string) =>
  readFileSync(
    new URL(`../../fixtures/income-tax/wikipedia/${name}`, import.meta.url),
    "utf8",
  );

export const bracketText = joinRowCells(
  stripNoinclude(fixture("brackets-2026.wikitext"))
    .replace(
      "{{מדרגות מס בישראל/פתיח}}",
      stripNoinclude(fixture("brackets-header.wikitext")).trim(),
    )
    .trim(),
);
const creditTable = fixture("credit-point-article.wikitext")
  .match(/\{\|[\s\S]*?\|\}/g)
  ?.find((table) => table.includes("ערך חודשי"));
if (!creditTable)
  throw new Error("Historical credit-point fixture table is missing");
export const creditPointText = creditTable;

export const brackets2026 = [
  { minIncome: 0, maxIncome: 7010, taxRate: 0.1 },
  { minIncome: 7011, maxIncome: 10060, taxRate: 0.14 },
  { minIncome: 10061, maxIncome: 19000, taxRate: 0.2 },
  { minIncome: 19001, maxIncome: 25100, taxRate: 0.31 },
  { minIncome: 25101, maxIncome: 46690, taxRate: 0.35 },
  { minIncome: 46691, maxIncome: 60130, taxRate: 0.47 },
  { minIncome: 60131, maxIncome: null, taxRate: 0.5 },
];

/** The table rows as the model should read them: 2000–2025, in order. */
export const creditPointRows = [
  [2000, 167],
  [2001, 168],
  [2002, 170],
  [2003, 181],
  [2004, 178],
  [2005, 178],
  [2006, 178],
  [2007, 178],
  [2008, 189],
  [2009, 197],
  [2010, 205],
  [2011, 209],
  [2012, 215],
  [2013, 218],
  [2014, 218],
  [2015, 218],
  [2016, 216],
  [2017, 215],
  [2018, 216],
  [2019, 218],
  [2020, 219],
  [2021, 218],
  [2022, 223],
  [2023, 235],
  [2024, 242],
  [2025, 242],
].map(([year, monthlyValue]) => ({ year, monthlyValue }));
