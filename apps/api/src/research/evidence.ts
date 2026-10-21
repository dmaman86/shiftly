/** Characters a model may swap when it copies text: dashes and quote marks. */
const EQUIVALENTS: readonly (readonly [RegExp, string])[] = [
  [/[-‐-―−]/, "[-\\u2010-\\u2015\\u2212]"],
  [/["״“”]/, '["\\u05f4\\u201c\\u201d]'],
  [/['׳‘’]/, "['\\u05f3\\u2018\\u2019]"],
];

/** Shorter quotes ("242", "10%") are found almost anywhere and prove nothing. */
export const MIN_QUOTE_CHARACTERS = 12;

export type QuoteMatch = {
  /** The quoted passage exactly as it is in the fetched content. */
  readonly span: string;
  /** "[page N]" of the passage start; null for documents without pages. */
  readonly page: number | null;
};

/**
 * Finds a model quote in the fetched content. Whitespace may differ (PDF text
 * has no reliable spacing) and dashes or quote marks may be swapped; every
 * other character must match in order.
 */
export function locateQuote(content: string, quote: string): QuoteMatch | null {
  const characters = [...quote.replace(/\s+/g, "")];
  if (characters.length < MIN_QUOTE_CHARACTERS) return null;
  const pattern = characters.map(characterPattern).join("\\s*");
  const match = new RegExp(pattern, "u").exec(content);
  if (match === null) return null;
  return { span: match[0], page: pageAt(content, match.index) };
}

function characterPattern(character: string): string {
  for (const [matches, pattern] of EQUIVALENTS) {
    if (matches.test(character)) return pattern;
  }
  return character.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pageAt(content: string, index: number): number | null {
  const markers = [...content.slice(0, index).matchAll(/\[page (\d+)\]/g)];
  const last = markers.at(-1);
  return last ? Number(last[1]) : null;
}

/** The page a source reference names ("page 10", "p. 10", "עמוד 10"). */
export function referencedPage(sourceReference: string): number | null {
  const match = /(?:page|p\.|עמוד|עמ')\s*(\d+)/i.exec(sourceReference);
  return match ? Number(match[1]) : null;
}
