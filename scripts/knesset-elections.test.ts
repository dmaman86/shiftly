import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import {
  CALENDAR_DIR,
  mergeElectionItems,
  parseElection,
  readRegistry,
  reconcileElection,
} from "./knesset-elections.ts";
import {
  electionFields,
  extractWikipediaElection,
} from "./wikipedia-elections.ts";

const known = [
  { knessetNumber: 25, date: "2022-11-01" },
  { knessetNumber: 26, date: "2026-10-27" },
];
const wikitext = `{{אירוע עתידי|תאריך=27 באוקטובר 2026}}
{{בחירות בישראל
|שם=הבחירות לכנסת העשרים ושש
|יום הבחירות=27 באוקטובר 2026, ט"ז בחשוון התשפ"ז
|מערכת בחירות הבאה=[[הבחירות לכנסת העשרים ושבע|2030]]
}}`;

test("extracts the explicit election field, not other article dates", () => {
  assert.deepEqual(extractWikipediaElection(wikitext, 26), known[1]);
  assert.deepEqual(
    extractWikipediaElection(
      wikitext.replace(
        "יום הבחירות=27 באוקטובר 2026",
        "יום הבחירות=[[27 באוקטובר]] [[2026]]",
      ),
      26,
    ),
    known[1],
  );
  assert.equal(
    electionFields(wikitext).get("מערכת בחירות הבאה"),
    "[[הבחירות לכנסת העשרים ושבע|2030]]",
  );
});
test("ignores comments and rejects missing or ambiguous infoboxes", () => {
  assert.deepEqual(
    extractWikipediaElection(`<!-- ${wikitext} -->${wikitext}`, 26),
    known[1],
  );
  for (const page of ["", "<h1>Access denied</h1>", wikitext + wikitext]) {
    assert.throws(() => extractWikipediaElection(page, 26));
  }
});
test("rejects identity mismatches, duplicate fields and unsupported date formats", () => {
  assert.throws(() => extractWikipediaElection(wikitext, 27));
  assert.throws(() =>
    extractWikipediaElection(
      wikitext.replace("|יום הבחירות=", "|יום הבחירות=2026\n|יום הבחירות="),
      26,
    ),
  );
  assert.throws(() =>
    extractWikipediaElection(
      wikitext.replace(
        "יום הבחירות=27 באוקטובר 2026",
        "יום הבחירות=אולי באוקטובר",
      ),
      26,
    ),
  );
  assert.throws(() =>
    extractWikipediaElection(
      wikitext.replace(
        "יום הבחירות=27 באוקטובר 2026",
        "יום הבחירות=31 בפברואר 2026",
      ),
      26,
    ),
  );
});
test("year-only dates do not become confirmed future elections", () => {
  assert.equal(
    extractWikipediaElection(
      wikitext.replace('27 באוקטובר 2026, ט"ז בחשוון התשפ"ז', "2030"),
      26,
    ),
    undefined,
  );
  assert.equal(
    extractWikipediaElection(
      wikitext.replace(/\|יום הבחירות=[^\n]+\n/, ""),
      26,
    ),
    undefined,
  );
});
test("rejects invalid dates and years outside generated coverage", () => {
  for (const date of ["2026-02-30", "2026-13-01", "2041-01-01", "2026-1-01"]) {
    assert.throws(() => parseElection({ knessetNumber: 26, date }));
  }
});
test("unchanged past announcement is harmless", () => {
  assert.deepEqual(reconcileElection(known, known[1], "2027-01-01"), known);
});
test("updates the upcoming election and accepts the next Knesset", () => {
  assert.equal(
    reconcileElection(
      known,
      { knessetNumber: 26, date: "2026-11-03" },
      "2026-10-19",
    )[1].date,
    "2026-11-03",
  );
  assert.equal(
    reconcileElection(
      known,
      { knessetNumber: 27, date: "2030-11-05" },
      "2027-01-01",
    ).length,
    3,
  );
});
test("rejects historical rewrites, skipped numbers and dates in the past", () => {
  for (const election of [
    { knessetNumber: 25, date: "2022-11-02" },
    { knessetNumber: 26, date: "2026-11-03" },
    { knessetNumber: 28, date: "2030-11-05" },
    { knessetNumber: 27, date: "2026-01-01" },
  ])
    assert.throws(() => reconcileElection(known, election, "2027-01-01"));
});
test("merging preserves holidays, removes stale election dates and is idempotent", () => {
  const holiday = {
    date: "2026-04-02",
    title: "Pesach I",
    category: "holiday",
    yomtov: true,
  };
  const oldElection = {
    date: "2026-10-20",
    category: "election",
    subcat: "knesset",
    knessetNumber: 26,
  };
  const merged = mergeElectionItems([holiday, oldElection], known, 2026);
  assert.deepEqual(merged[0], holiday);
  assert.equal(merged[1].date, "2026-10-27");
  assert.equal(merged[1].knessetNumber, 26);
  assert.equal(Object.hasOwn(merged[1], "yomtov"), false);
  assert.deepEqual(mergeElectionItems(merged, known, 2026), merged);
  assert.equal(mergeElectionItems([oldElection], [], 2026).length, 0);
});
test("generated calendars contain every registered election exactly once", async () => {
  const { elections } = await readRegistry();
  for (const election of elections) {
    const payload = JSON.parse(
      await readFile(
        new URL(`${election.date.slice(0, 4)}.json`, CALENDAR_DIR),
        "utf8",
      ),
    );
    assert.deepEqual(
      payload.items.filter(
        (item: Record<string, unknown>) =>
          item.knessetNumber === election.knessetNumber,
      ),
      [
        {
          ...election,
          title: "Knesset Election Day",
          category: "election",
          subcat: "knesset",
        },
      ],
    );
  }
});
