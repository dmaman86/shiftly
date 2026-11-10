/**
 * Data rows of a MediaWiki table, as cell texts. Header cells ("!") are
 * skipped. A row may put its cells on one line ("| a || b") or one per line
 * ("| a" then "| b"); both forms produce the same cells.
 */
export function wikitextTableRows(text: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  const flush = () => {
    if (current.length > 0) rows.push(current);
    current = [];
  };

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (line.startsWith("|-") || line.startsWith("|}")) {
      flush();
    } else if (line.startsWith("|")) {
      current.push(
        ...line
          .slice(1)
          .split("||")
          .map((cell) => cell.trim()),
      );
    }
  }
  flush();
  return rows;
}

/**
 * Rewrites one-cell-per-line rows as one row per line ("| a || b"), which is
 * equivalent wikitext. With a cell per line the model loses track of which row
 * a value belongs to (seen live: the 31% row came back as 14%).
 */
export function joinRowCells(text: string): string {
  const lines: string[] = [];
  let cells: string[] = [];
  const flush = () => {
    if (cells.length > 0) lines.push(`| ${cells.join(" || ")}`);
    cells = [];
  };

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (
      line.startsWith("|") &&
      !line.startsWith("|-") &&
      !line.startsWith("|}")
    ) {
      cells.push(
        ...line
          .slice(1)
          .split("||")
          .map((cell) => cell.trim()),
      );
    } else {
      flush();
      lines.push(rawLine);
    }
  }
  flush();
  return lines.join("\n");
}

/** Drops the parts of a template page that are not transcluded. */
export function stripNoinclude(wikitext: string): string {
  return wikitext.replace(/<noinclude>[\s\S]*?<\/noinclude>/g, "");
}

/**
 * The level-2 section ("== … ==") whose heading satisfies `matches`, up to the
 * next level-2 heading; deeper headings stay inside it. Null when no heading
 * matches.
 */
export function wikitextSection(
  wikitext: string,
  matches: (heading: string) => boolean,
): string | null {
  const lines = wikitext.split("\n");
  const isLevel2 = (line: string) => /^==[^=]/.test(line);
  const start = lines.findIndex((line) => isLevel2(line) && matches(line));
  if (start === -1) return null;
  const next = lines.findIndex((line, i) => i > start && isLevel2(line));
  return lines.slice(start, next === -1 ? undefined : next).join("\n");
}
