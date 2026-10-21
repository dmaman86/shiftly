import { describe, expect, it } from "vitest";
import { EMPLOYEE_CONTRIBUTIONS_TITLE } from "../../src/social-security/kolzchut-source.ts";
import { fakeKolZchutSource, KOL_ZCHUT_WIKI } from "./kolzchut-fixtures.ts";

describe("KolZchutSocialSecuritySource", () => {
  it("renders the 2026 section with the data values of January 2026", async () => {
    const document = await fakeKolZchutSource().employeeContributionsAt(
      new Date("2026-07-01T00:00:00Z"),
    );
    expect(document.text).toContain("על חלק השכר שעד 7,703 ₪ (נכון ל-2026)");
    expect(document.text).toContain("ועד 51,910 ₪");
    expect(document.text).toContain("דמי ביטוח בריאות בשיעור 5.17%");
    expect(document.text).not.toMatch(/\{\{|<!--/);
    expect(document.ref).toMatchObject({
      url: "https://www.kolzchut.org.il/w/he/index.php?oldid=604619",
      revisionId: 604619,
      license: "CC-BY-NC-SA-2.5-IL",
    });
    expect(document.includes.map((ref) => ref.revisionId)).toEqual([
      604858, 604455, 604431,
    ]);
  });

  it("renders an old revision with the values of its own date, not today's", async () => {
    const document = await fakeKolZchutSource().employeeContributionsAt(
      new Date("2020-07-01T00:00:00Z"),
    );
    expect(document.text).toContain('(6,331 ש"ח, נכון ל-2020)');
    expect(document.text).toContain('(44,020 ש"ח, נכון ל-2020)');
    expect(document.text).toContain("3.50%");
    expect(document.text).not.toContain("7,703");
    expect(document.ref.revisionId).toBe(390155);
  });

  it("keeps only the employee section", async () => {
    const document = await fakeKolZchutSource().employeeContributionsAt(
      new Date("2026-07-01T00:00:00Z"),
    );
    expect(
      document.text.startsWith("==שיעור דמי הביטוח שעל המעסיק לנכות"),
    ).toBe(true);
    expect(document.text).not.toContain("4.51%");
  });

  it("stops when a data page has no revision at that date", async () => {
    const wiki = {
      ...KOL_ZCHUT_WIKI,
      "נתון:מדרגת גבייה מופחתת": [
        {
          revid: 1,
          timestamp: "2026-09-01T00:00:00Z",
          wikitext: "<onlyinclude>1</onlyinclude>",
        },
      ],
    };
    await expect(
      fakeKolZchutSource(wiki).employeeContributionsAt(
        new Date("2026-07-01T00:00:00Z"),
      ),
    ).rejects.toMatchObject({ code: "year_not_covered" });
  });

  it("stops when the article no longer has the employee section", async () => {
    const wiki = {
      ...KOL_ZCHUT_WIKI,
      [EMPLOYEE_CONTRIBUTIONS_TITLE]: [
        { revid: 1, timestamp: "2026-01-01T00:00:00Z", wikitext: "== אחר ==" },
      ],
    };
    await expect(
      fakeKolZchutSource(wiki).employeeContributionsAt(
        new Date("2026-07-01T00:00:00Z"),
      ),
    ).rejects.toMatchObject({ code: "source_format_changed" });
  });
});
