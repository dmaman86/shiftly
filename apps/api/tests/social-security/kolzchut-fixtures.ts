import { readFileSync } from "node:fs";
import { MediaWikiClient } from "../../src/shared/mediawiki-client.ts";
import {
  EMPLOYEE_CONTRIBUTIONS_TITLE,
  KOL_ZCHUT,
  KolZchutSocialSecuritySource,
} from "../../src/social-security/kolzchut-source.ts";
import { fakeMediaWikiFetch, type FakeWiki } from "../shared/fake-mediawiki.ts";

const fixture = (name: string) =>
  readFileSync(
    new URL(`../fixtures/social-security/kolzchut/${name}`, import.meta.url),
    "utf8",
  );

const data = (value: string) => `<onlyinclude>${value}</onlyinclude>\n\nnote`;

/** Revisions recorded in tests/fixtures/social-security/kolzchut/SOURCES.md. */
export const KOL_ZCHUT_WIKI: FakeWiki = {
  [EMPLOYEE_CONTRIBUTIONS_TITLE]: [
    {
      revid: 390155,
      timestamp: "2020-02-20T11:02:51Z",
      wikitext: fixture("article-2020.wikitext"),
    },
    {
      revid: 604619,
      timestamp: "2026-01-19T07:00:03Z",
      wikitext: fixture("article-2026.wikitext"),
    },
  ],
  "נתון:השכר הממוצע לפי סעיף 2": [
    {
      revid: 385229,
      timestamp: "2020-01-08T12:18:09Z",
      wikitext: data("10551"),
    },
  ],
  "נתון:הסכום הבסיסי לפי פסקה 3": [
    {
      revid: 385233,
      timestamp: "2020-01-08T12:25:00Z",
      wikitext: data("8804"),
    },
    {
      revid: 604431,
      timestamp: "2026-01-14T09:30:25Z",
      wikitext: data("10382"),
    },
  ],
  "נתון:השנה הנוכחית": [
    {
      revid: 385238,
      timestamp: "2020-01-08T12:38:32Z",
      wikitext: data("2020"),
    },
    {
      revid: 604455,
      timestamp: "2026-01-14T10:05:44Z",
      wikitext: data("2026"),
    },
  ],
  "נתון:מדרגת גבייה מופחתת": [
    {
      revid: 604858,
      timestamp: "2026-01-22T08:48:52Z",
      wikitext: data("7703 "),
    },
  ],
};

export const NOW = new Date("2026-10-18T12:00:00.000Z");

export const fakeKolZchutSource = (wiki: FakeWiki = KOL_ZCHUT_WIKI) =>
  new KolZchutSocialSecuritySource(
    new MediaWikiClient(KOL_ZCHUT, {
      fetch: fakeMediaWikiFetch(wiki),
      now: () => NOW,
    }),
  );

/** What the model should read from the 2026 section. */
export const answer2026 = {
  status: "complete",
  asOfYear: 2026,
  reducedRateCeiling: 7703,
  maxInsurableIncome: 51910,
  reducedRate: { nationalInsurance: 0.0104, health: 0.0323, total: 0.0427 },
  fullRate: { nationalInsurance: 0.07, health: 0.0517, total: 0.1217 },
};

/** What the model should read from the 2020 section. */
export const answer2020 = {
  status: "complete",
  asOfYear: 2020,
  reducedRateCeiling: 6331,
  maxInsurableIncome: 44020,
  reducedRate: { nationalInsurance: 0.004, health: 0.031, total: 0.035 },
  fullRate: { nationalInsurance: 0.07, health: 0.05, total: 0.12 },
};
