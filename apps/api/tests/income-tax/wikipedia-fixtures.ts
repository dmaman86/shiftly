import { readFileSync } from "node:fs";
import {
  BRACKET_HEADER_TITLE,
  BRACKET_INDEX_TITLE,
  CREDIT_POINT_TITLE,
  HEBREW_WIKIPEDIA,
  WikipediaIncomeTaxSource,
} from "../../src/income-tax/wikipedia-source.ts";
import { MediaWikiClient } from "../../src/shared/mediawiki-client.ts";
import { fakeMediaWikiFetch, type FakeWiki } from "../shared/fake-mediawiki.ts";

export const fixture = (name: string) =>
  readFileSync(
    new URL(`../fixtures/income-tax/wikipedia/${name}`, import.meta.url),
    "utf8",
  );

export const BRACKETS_2026_TITLE = "תבנית:מדרגות מס 2026";

type FakePage = { readonly revid: number; readonly wikitext: string };

/** Revisions recorded in tests/fixtures/income-tax/wikipedia/SOURCES.md. */
export const PAGES: Readonly<Record<string, FakePage>> = {
  [BRACKET_INDEX_TITLE]: {
    revid: 42998677,
    wikitext: fixture("brackets-index.wikitext"),
  },
  [BRACKET_HEADER_TITLE]: {
    revid: 21493632,
    wikitext: fixture("brackets-header.wikitext"),
  },
  [BRACKETS_2026_TITLE]: {
    revid: 42998646,
    wikitext: fixture("brackets-2026.wikitext"),
  },
  [CREDIT_POINT_TITLE]: {
    revid: 41634061,
    wikitext: fixture("credit-point-article.wikitext"),
  },
};

export const NOW = new Date("2026-10-17T12:00:00.000Z");

/** Each page as a single current revision; a page set to undefined is missing. */
export const fakeSource = (
  pages: Readonly<Record<string, FakePage | undefined>> = PAGES,
) => {
  const wiki: FakeWiki = Object.fromEntries(
    Object.entries(pages).flatMap(([title, page]) =>
      page ? [[title, [{ ...page, timestamp: "2026-01-01T00:00:00Z" }]]] : [],
    ),
  );
  return new WikipediaIncomeTaxSource(
    new MediaWikiClient(HEBREW_WIKIPEDIA, {
      fetch: fakeMediaWikiFetch(wiki),
      now: () => NOW,
    }),
  );
};

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
