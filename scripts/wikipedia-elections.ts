import { isRecord, parseElection, type Election } from "./knesset-elections.ts";

const API_URL = "https://he.wikipedia.org/w/api.php";
const MONTHS = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
];
const ORDINALS = [
  "העשרים",
  "העשרים ואחת",
  "העשרים ושתיים",
  "העשרים ושלוש",
  "העשרים וארבע",
  "העשרים וחמש",
  "העשרים ושש",
  "העשרים ושבע",
  "העשרים ושמונה",
  "העשרים ותשע",
  "השלושים",
];

export const electionTitle = (number: number): string => {
  const ordinal = ORDINALS[number - 20];
  if (!ordinal)
    throw new Error(
      `Unsupported Knesset number: ${number}; extend the title mapping`,
    );
  return `הבחירות לכנסת ${ordinal}`;
};

export const articleUrl = (title: string): string =>
  `https://he.wikipedia.org/wiki/${title.replaceAll(" ", "_")}`;

// Split only top-level template parameters, never pipes inside links or nested templates.
export const electionFields = (wikitext: string): Map<string, string> => {
  const text = wikitext.replace(/<!--[\s\S]*?-->/g, "");
  const starts = [...text.matchAll(/\{\{\s*בחירות בישראל\s*(?=\||\n)/g)];
  if (starts.length !== 1)
    throw new Error("Expected exactly one elections infobox");
  const start = starts[0].index;
  const parts: string[] = [];
  let depth = 0;
  let links = 0;
  let segment = start + 2;
  let closed = false;
  for (let i = start; i < text.length; i++) {
    const pair = text.slice(i, i + 2);
    if (pair === "{{") {
      depth++;
      i++;
    } else if (pair === "}}") {
      depth--;
      if (depth === 0) {
        parts.push(text.slice(segment, i));
        closed = true;
        break;
      }
      i++;
    } else if (pair === "[[") {
      links++;
      i++;
    } else if (pair === "]]") {
      links--;
      i++;
    } else if (text[i] === "|" && depth === 1 && links === 0) {
      parts.push(text.slice(segment, i));
      segment = i + 1;
    }
  }
  if (!closed) throw new Error("Unclosed elections infobox");
  const fields = new Map<string, string>();
  for (const part of parts.slice(1)) {
    const equals = part.indexOf("=");
    if (equals < 0) continue;
    const key = part.slice(0, equals).trim();
    if (fields.has(key)) throw new Error(`Duplicate infobox parameter: ${key}`);
    fields.set(key, part.slice(equals + 1).trim());
  }
  return fields;
};

export const extractWikipediaElection = (
  wikitext: string,
  number: number,
): Election | undefined => {
  const fields = electionFields(wikitext);
  if (fields.get("שם") !== electionTitle(number))
    throw new Error("Election infobox identity mismatch");
  const raw = fields.get("יום הבחירות");
  // A next-election article may exist before any exact date has been announced.
  if (!raw || /^\d{4}$/.test(raw.trim())) return undefined;
  const value = raw
    .replace(/\[\[(?:[^\]|]*\|)?([^\]]+)\]\]/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  const match = /^(\d{1,2})\s+ב?([א-ת]+)\s+(\d{4})(?=\s|,|$)/.exec(value);
  if (!match)
    throw new Error("Unrecognized election date field; manual review required");
  const [, day, monthName, year] = match;
  const month = MONTHS.indexOf(monthName) + 1;
  if (!month) throw new Error("Unknown Hebrew month name");
  return parseElection({
    knessetNumber: number,
    date: `${year}-${String(month).padStart(2, "0")}-${day.padStart(2, "0")}`,
  });
};

export interface WikipediaPage {
  title: string;
  revisionId: number;
  revisionTimestamp: string;
  wikitext: string;
}

export const fetchElectionPage = async (
  number: number,
): Promise<WikipediaPage | undefined> => {
  const title = electionTitle(number);
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    formatversion: "2",
    prop: "revisions",
    rvprop: "ids|timestamp|content",
    rvslots: "main",
    titles: title,
    maxlag: "5",
  });
  const response = await fetch(`${API_URL}?${params}`, {
    signal: AbortSignal.timeout(30_000),
    headers: {
      Accept: "application/json",
      "User-Agent":
        "ShiftlyElectionCalendar/1.0 (https://github.com/dmaman86/shiftly)",
    },
  });
  if (!response.ok)
    throw new Error(`Wikipedia returned HTTP ${response.status}`);
  const payload: unknown = await response.json();
  if (
    !isRecord(payload) ||
    payload.error ||
    !isRecord(payload.query) ||
    !Array.isArray(payload.query.pages) ||
    payload.query.pages.length !== 1
  )
    throw new Error("Invalid Wikipedia API response");
  const page: unknown = payload.query.pages[0];
  if (!isRecord(page) || page.title !== title)
    throw new Error("Wikipedia page identity mismatch");
  if (page.missing === true) return undefined;
  const revision: unknown = Array.isArray(page.revisions)
    ? page.revisions[0]
    : undefined;
  if (
    !isRecord(revision) ||
    typeof revision.revid !== "number" ||
    typeof revision.timestamp !== "string" ||
    !isRecord(revision.slots) ||
    !isRecord(revision.slots.main) ||
    typeof revision.slots.main.content !== "string"
  )
    throw new Error("Missing Wikipedia revision content");
  return {
    title,
    revisionId: revision.revid,
    revisionTimestamp: revision.timestamp,
    wikitext: revision.slots.main.content,
  };
};
