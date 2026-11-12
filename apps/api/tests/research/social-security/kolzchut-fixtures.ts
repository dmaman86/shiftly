import { readFileSync } from "node:fs";
import { wikitextSection } from "../offline/shared/wikitext.ts";
import { renderKolZchutTemplates } from "../offline/social-security/kolzchut-templates.ts";

/** Explicit recorded data for two historical fixtures, never current-value or nearest-year fallback. */
export const kolZchutSection = (year: 2020 | 2026): string => {
  const text = readFileSync(
    new URL(
      `../../fixtures/social-security/kolzchut/article-${year}.wikitext`,
      import.meta.url,
    ),
    "utf8",
  );
  const section = wikitextSection(text, (heading) =>
    heading.includes("לנכות משכר העובד"),
  );
  if (section === null)
    throw new Error("Historical employee section is missing");
  const values = new Map([
    ["השכר הממוצע לפי סעיף 2", "10551"],
    ["הסכום הבסיסי לפי פסקה 3", year === 2020 ? "8804" : "10382"],
    ["השנה הנוכחית", String(year)],
    ["מדרגת גבייה מופחתת", "7703"],
  ]);
  const rendered = renderKolZchutTemplates(section, values);
  if (rendered === null)
    throw new Error("Historical employee fixture has unresolved templates");
  return rendered.trim();
};
