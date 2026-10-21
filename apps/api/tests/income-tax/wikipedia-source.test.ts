import { describe, expect, it } from "vitest";
import { CREDIT_POINT_TITLE } from "../../src/income-tax/wikipedia-source.ts";
import {
  BRACKETS_2026_TITLE,
  fakeSource,
  NOW,
  PAGES,
} from "./wikipedia-fixtures.ts";

describe("WikipediaIncomeTaxSource", () => {
  it("lists every year table, with the ranges some tables cover", async () => {
    const index = await fakeSource().bracketTableIndex();
    expect(index.entries).toHaveLength(19);
    expect(index.entries[0]).toEqual({
      fromYear: 2006,
      toYear: 2006,
      title: "תבנית:מדרגות מס בישראל/2006",
    });
    expect(index.entries).toContainEqual({
      fromYear: 2013,
      toYear: 2014,
      title: "תבנית:מדרגות מס בישראל/2013",
    });
    expect(index.entries).toContainEqual({
      fromYear: 2024,
      toYear: 2025,
      title: "תבנית:מדרגות מס 2024",
    });
    expect(index.entries.at(-1)).toEqual({
      fromYear: 2026,
      toYear: 2026,
      title: BRACKETS_2026_TITLE,
    });
  });

  it("inlines the shared column headers into a year table and cites its revision", async () => {
    const table = await fakeSource().bracketTable(BRACKETS_2026_TITLE);
    expect(table.format).toBe("wikitext");
    expect(table.text.startsWith('{| class="wikitable"')).toBe(true);
    expect(table.text).toContain("! הכנסה עד");
    // One line per row, so the model cannot mix up which row a value is in.
    expect(table.text).toContain(
      `| '''31%''' || 25,100 ש"ח || 1,891 ש"ח || 4,807 ש"ח || 301,200 ש"ח || 22,692 ש"ח || 57,684 ש"ח`,
    );
    expect(table.text).not.toContain("{{מדרגות מס בישראל/פתיח}}");
    expect(table.text).not.toContain("noinclude");
    expect(table.ref).toEqual({
      url: "https://he.wikipedia.org/w/index.php?oldid=42998646",
      title: BRACKETS_2026_TITLE,
      revisionId: 42998646,
      license: "CC-BY-SA-4.0",
      retrievedAt: NOW.toISOString(),
    });
  });

  it("sends only the yearly value table of the credit point article", async () => {
    const table = await fakeSource().creditPointTable();
    expect(table.text.startsWith("{|")).toBe(true);
    expect(table.text.endsWith("|}")).toBe(true);
    expect(table.text).toContain("'''2025''' || 242");
    expect(table.text).not.toContain("זכאות");
    expect(table.ref.revisionId).toBe(41634061);
  });

  it("reports a missing page as a source change", async () => {
    const source = fakeSource({ ...PAGES, [CREDIT_POINT_TITLE]: undefined });
    await expect(source.creditPointTable()).rejects.toMatchObject({
      code: "source_format_changed",
      details: { title: CREDIT_POINT_TITLE, missing: true },
    });
  });

  it("reports an article without the value table as a source change", async () => {
    const source = fakeSource({
      ...PAGES,
      [CREDIT_POINT_TITLE]: { revid: 1, wikitext: "No table here." },
    });
    await expect(source.creditPointTable()).rejects.toMatchObject({
      code: "source_format_changed",
    });
  });

  it("cites the shared header as an included revision of a year table", async () => {
    const table = await fakeSource().bracketTable(BRACKETS_2026_TITLE);
    expect(table.includes.map((ref) => ref.revisionId)).toEqual([21493632]);
  });
});
