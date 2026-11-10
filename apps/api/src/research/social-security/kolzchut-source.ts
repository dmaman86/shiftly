import { RulesPipelineError } from "../shared/errors.ts";
import {
  MediaWikiClient,
  type PageRevision,
  type MediaWikiSite,
} from "../shared/mediawiki-client.ts";
import type { SourceDocument } from "../shared/source.ts";
import { wikitextSection } from "../shared/wikitext.ts";
import {
  dataPageValue,
  dataTemplateNames,
  renderKolZchutTemplates,
} from "./kolzchut-templates.ts";
import type { SocialSecuritySourceProvider } from "./social-security-source.ts";

// shiftly is non-commercial, which this license requires (with attribution).
export const KOL_ZCHUT: MediaWikiSite = {
  apiUrl: "https://www.kolzchut.org.il/w/he/api.php",
  indexUrl: "https://www.kolzchut.org.il/w/he/index.php",
  license: "CC-BY-NC-SA-2.5-IL",
};

export const EMPLOYEE_CONTRIBUTIONS_TITLE = "דמי ביטוח לאומי לעובד שכיר";
const DEDUCTIONS_HEADING = "לנכות משכר העובד";

/**
 * Kol Zchut as the source of employee National Insurance and health
 * insurance rates. The article section is rendered as it read on the given
 * date: its revision then, with each data page at its revision then.
 */
export class KolZchutSocialSecuritySource implements SocialSecuritySourceProvider {
  private readonly wiki: MediaWikiClient;

  constructor(wiki: MediaWikiClient = new MediaWikiClient(KOL_ZCHUT)) {
    this.wiki = wiki;
  }

  async employeeContributionsAt(at: Date): Promise<SourceDocument> {
    const article = await this.wiki.revisionAt(
      EMPLOYEE_CONTRIBUTIONS_TITLE,
      at,
    );
    const section = wikitextSection(article.wikitext, (heading) =>
      heading.includes(DEDUCTIONS_HEADING),
    );
    if (section === null) {
      throw new RulesPipelineError(
        "source_format_changed",
        "The article has no employee deductions section",
        { revisionId: article.revisionId },
      );
    }

    const names = dataTemplateNames(section);
    // One at a time: a few requests per run, kept gentle on a nonprofit site.
    const dataPages: PageRevision[] = [];
    for (const name of names) {
      dataPages.push(await this.wiki.revisionAt(`נתון:${name}`, at));
    }
    const values = new Map(
      names.map((name, i) => [name, dataPageValue(dataPages[i].wikitext)]),
    );
    const text = renderKolZchutTemplates(section, values);
    if (text === null) {
      throw new RulesPipelineError(
        "source_format_changed",
        "The employee deductions section has templates that cannot be resolved",
        { revisionId: article.revisionId, dataPages: names },
      );
    }

    return {
      format: "wikitext",
      text: text.trim(),
      ref: article.ref,
      includes: dataPages.map((page) => page.ref),
    };
  }
}
