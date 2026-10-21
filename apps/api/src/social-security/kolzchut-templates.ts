/**
 * Kol Zchut keeps yearly figures in data pages ("נתון:<name>") and formats
 * arithmetic on them with {{חשב ועצב|<expression>|עיגול=<digits>}}. MediaWiki
 * always expands both with today's values, so an old revision has to be
 * rendered here, with the data page revisions of the same date.
 */

const DATA_TEMPLATE = /\{\{\s*נתון:([^{}|]+?)\s*\}\}/g;
const CALCULATION =
  /\{\{\s*חשב ועצב\s*\|([^{}|]+?)(?:\|\s*עיגול\s*=\s*(\d+)\s*)?\}\}/g;

/** Names of the data pages a text uses, without the "נתון:" prefix. */
export function dataTemplateNames(text: string): string[] {
  return [...new Set([...text.matchAll(DATA_TEMPLATE)].map((m) => m[1]))];
}

/**
 * The transcluded value of a data page: what is inside <onlyinclude>, or the
 * page without its notes in older revisions. Invisible direction and
 * zero-width marks are dropped (seen in the 2025 revisions).
 */
export function dataPageValue(wikitext: string): string {
  const only = /<onlyinclude>([\s\S]*?)<\/onlyinclude>/.exec(wikitext);
  const value = only
    ? only[1]
    : wikitext
        .replace(/<noinclude>[\s\S]*?<\/noinclude>/g, "")
        .replace(/<!--[\s\S]*?-->/g, "")
        .replace(/\[\[קטגוריה:[^\]]*\]\]/g, "");
  return value.replace(/[\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, "").trim();
}

/**
 * Replaces every data template with its value and evaluates every
 * calculation. Returns null when something is left unresolved, so a text
 * with a missing value never reaches the model.
 */
export function renderKolZchutTemplates(
  text: string,
  values: ReadonlyMap<string, string>,
): string | null {
  const withValues = text
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(DATA_TEMPLATE, (match, name: string) => values.get(name) ?? match);
  const rendered = withValues.replace(
    CALCULATION,
    (match, expression: string, digits?: string) => {
      const result = evaluateArithmetic(expression);
      if (result === null) return match;
      return result.toLocaleString("en-US", {
        maximumFractionDigits: digits === undefined ? 2 : Number(digits),
      });
    },
  );
  // Not DATA_TEMPLATE: test() on a /g regex is stateful.
  return /\{\{\s*(?:נתון:|חשב ועצב)/.test(rendered) ? null : rendered;
}

/**
 * Evaluates + - * / and parentheses over decimal numbers. Anything else
 * returns null; nothing is passed to eval.
 */
export function evaluateArithmetic(expression: string): number | null {
  const tokens = expression.match(/\d+(?:\.\d+)?|[-+*/()]|\S/g) ?? [];
  let position = 0;

  const peek = () => tokens[position];
  const next = () => tokens[position++];

  const primary = (): number | null => {
    const token = next();
    if (token === "(") {
      const value = sum();
      return next() === ")" ? value : null;
    }
    if (token === "-") {
      const value = primary();
      return value === null ? null : -value;
    }
    return token !== undefined && /^\d/.test(token) ? Number(token) : null;
  };

  const product = (): number | null => {
    let value = primary();
    while (value !== null && (peek() === "*" || peek() === "/")) {
      const operator = next();
      const right = primary();
      if (right === null) return null;
      value = operator === "*" ? value * right : value / right;
    }
    return value;
  };

  const sum = (): number | null => {
    let value = product();
    while (value !== null && (peek() === "+" || peek() === "-")) {
      const operator = next();
      const right = product();
      if (right === null) return null;
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  };

  const value = sum();
  return value !== null && position === tokens.length && Number.isFinite(value)
    ? value
    : null;
}
