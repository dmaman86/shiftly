import { RulesPipelineError } from "../shared/errors.ts";
import {
  MediaWikiClient,
  type MediaWikiSite,
} from "../shared/mediawiki-client.ts";
import type { SourceDocument } from "../shared/source.ts";
import { joinRowCells, stripNoinclude } from "../shared/wikitext.ts";
import type {
  BracketTableEntry,
  BracketTableIndex,
  IncomeTaxSourceProvider,
} from "./income-tax-source.ts";

export const HEBREW_WIKIPEDIA: MediaWikiSite = {
  apiUrl: "https://he.wikipedia.org/w/api.php",
  indexUrl: "https://he.wikipedia.org/w/index.php",
  license: "CC-BY-SA-4.0",
};

/** Tabbed template with one sub-template per tax year (or range of years). */
export const BRACKET_INDEX_TITLE = "תבנית:מדרגות מס בישראל";
/** Shared column headers; year tables transclude it instead of repeating them. */
export const BRACKET_HEADER_TITLE = "תבנית:מדרגות מס בישראל/פתיח";
export const CREDIT_POINT_TITLE = "נקודת זיכוי";

/**
 * Hebrew Wikipedia as the source of income-tax values. shiftly is indicative
 * only, so a cited public source is enough; every value keeps the permanent
 * link of the revision it was read from.
 */
export class WikipediaIncomeTaxSource implements IncomeTaxSourceProvider {
  private readonly wiki: MediaWikiClient;

  constructor(wiki: MediaWikiClient = new MediaWikiClient(HEBREW_WIKIPEDIA)) {
    this.wiki = wiki;
  }

  async bracketTableIndex(): Promise<BracketTableIndex> {
    const page = await this.wiki.revisionAt(BRACKET_INDEX_TITLE);
    const entries = parseBracketIndex(page.wikitext);
    if (entries.length === 0) {
      throw new RulesPipelineError(
        "source_format_changed",
        "The bracket index lists no year tables",
        { title: page.title, revisionId: page.revisionId },
      );
    }
    return { entries, ref: page.ref };
  }

  async bracketTable(title: string): Promise<SourceDocument> {
    const [table, header] = await Promise.all([
      this.wiki.revisionAt(title),
      this.wiki.revisionAt(BRACKET_HEADER_TITLE),
    ]);
    const headerName = BRACKET_HEADER_TITLE.replace(/^תבנית:/, "");
    const transclusion = `{{${headerName}}}`;
    if (!table.wikitext.includes(transclusion)) {
      throw new RulesPipelineError(
        "source_format_changed",
        "The bracket table no longer uses the shared header",
        { title: table.title, revisionId: table.revisionId },
      );
    }
    // Header inlined so the extractor sees which column is which.
    const text = joinRowCells(
      stripNoinclude(table.wikitext)
        .replace(transclusion, stripNoinclude(header.wikitext).trim())
        .trim(),
    );
    return { format: "wikitext", text, ref: table.ref, includes: [header.ref] };
  }

  async creditPointTable(): Promise<SourceDocument> {
    const page = await this.wiki.revisionAt(CREDIT_POINT_TITLE);
    const text = tableContaining(page.wikitext, "ערך חודשי");
    if (text === null) {
      throw new RulesPipelineError(
        "source_format_changed",
        "The credit point article has no yearly value table",
        { title: page.title, revisionId: page.revisionId },
      );
    }
    return { format: "wikitext", text, ref: page.ref, includes: [] };
  }
}

/**
 * Pairs each tab label ("|שם2={{משמאל לימין|2024-2025}}") with its content
 * ("|תוכן2={{מדרגות מס 2024}}"). A label may name one year or a range.
 */
export function parseBracketIndex(wikitext: string): BracketTableEntry[] {
  const labels = new Map<string, string>();
  const contents = new Map<string, string>();
  for (const line of wikitext.split("\n")) {
    const label = /^\|שם(\d+)=(.*)$/.exec(line.trim());
    if (label) labels.set(label[1], label[2]);
    const content = /^\|תוכן(\d+)=\{\{([^{}|]+)\}\}$/.exec(line.trim());
    if (content) contents.set(content[1], content[2].trim());
  }

  const entries: BracketTableEntry[] = [];
  for (const [tab, label] of labels) {
    const years = /(\d{4})(?:\s*-\s*(\d{4}))?/.exec(label);
    const template = contents.get(tab);
    if (!years || !template) continue;
    const first = Number(years[1]);
    const second = years[2] ? Number(years[2]) : first;
    entries.push({
      fromYear: Math.min(first, second),
      toYear: Math.max(first, second),
      title: `תבנית:${template}`,
    });
  }
  return entries.sort((a, b) => a.fromYear - b.fromYear);
}

/** The whole "{| … |}" table that contains `marker`, or null. Tables do not nest here. */
function tableContaining(wikitext: string, marker: string): string | null {
  const at = wikitext.indexOf(marker);
  if (at === -1) return null;
  const start = wikitext.lastIndexOf("{|", at);
  const end = wikitext.indexOf("\n|}", at);
  if (start === -1 || end === -1) return null;
  return wikitext.slice(start, end + "\n|}".length);
}
