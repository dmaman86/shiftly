import { describe, expect, it } from "vitest";
import {
  dataPageValue,
  dataTemplateNames,
  evaluateArithmetic,
  renderKolZchutTemplates,
} from "../../src/social-security/kolzchut-templates.ts";

describe("Kol Zchut templates", () => {
  it("lists each data page a text uses once", () => {
    const text =
      "{{ חשב ועצב| {{נתון:מדרגת גבייה מופחתת}} }} עד {{נתון:מדרגת גבייה מופחתת}} ב-{{נתון:השנה הנוכחית}}";
    expect(dataTemplateNames(text)).toEqual([
      "מדרגת גבייה מופחתת",
      "השנה הנוכחית",
    ]);
  });

  it.each([
    ["<onlyinclude>7703 </onlyinclude>\n\n* note", "7703"],
    ["<onlyinclude>\u200b10139</onlyinclude>", "10139"],
    ["8648\n\n<!--\nnote\n-->\n\n[[קטגוריה:נתונים]]", "8648"],
  ])("reads the transcluded value of %j", (wikitext, value) => {
    expect(dataPageValue(wikitext)).toBe(value);
  });

  it("renders data values and calculations as the site shows them", () => {
    const text =
      'עד {{ חשב ועצב| {{נתון:השכר הממוצע לפי סעיף 2}}*0.6 | עיגול=0}} ש"ח ועד {{ חשב ועצב| {{נתון:הסכום הבסיסי לפי פסקה 3}}*5 | עיגול=0}} ש"ח, נכון ל-{{נתון:השנה הנוכחית}} <!-- note -->';
    const values = new Map([
      ["השכר הממוצע לפי סעיף 2", "10551"],
      ["הסכום הבסיסי לפי פסקה 3", "8804"],
      ["השנה הנוכחית", "2020"],
    ]);
    expect(renderKolZchutTemplates(text, values)).toBe(
      'עד 6,331 ש"ח ועד 44,020 ש"ח, נכון ל-2020 ',
    );
  });

  it("returns null when a value is missing, so the model never sees a template", () => {
    expect(
      renderKolZchutTemplates("עד {{נתון:לא ידוע}} ₪", new Map()),
    ).toBeNull();
    expect(
      renderKolZchutTemplates("{{ חשב ועצב| {{נתון:לא ידוע}}*5 }}", new Map()),
    ).toBeNull();
  });

  it.each([
    ["10382*5", 51910],
    ["9673*0.6", 5803.8],
    ["(1+2)*3 - 4/2", 7],
    ["-2*3", -6],
  ])("evaluates %s", (expression, value) => {
    expect(evaluateArithmetic(expression)).toBeCloseTo(value);
  });

  it.each(["alert(1)", "1+", "2**3", "(1", ""])(
    "rejects %j instead of evaluating it",
    (expression) => {
      expect(evaluateArithmetic(expression)).toBeNull();
    },
  );
});
