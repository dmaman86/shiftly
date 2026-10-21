import { parse, type DefaultTreeAdapterMap } from "parse5";
import { getDocumentProxy } from "unpdf";

type Node = DefaultTreeAdapterMap["node"];

export type DocumentText = {
  readonly text: string;
  readonly title: string | null;
};

/**
 * One line per text line of the PDF, items separated by a space, and a
 * "[page N]" marker before each page. Separating items keeps adjacent table
 * cells apart: without it "7,010" and "10%" read as "7,01010%".
 */
export async function pdfToText(bytes: Uint8Array): Promise<DocumentText> {
  // pdf.js takes ownership of the buffer it reads, so it gets a copy.
  const pdf = await getDocumentProxy(new Uint8Array(bytes), { verbosity: 0 });
  try {
    const pages: string[] = [];
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) =>
          "str" in item ? `${item.str}${item.hasEOL ? "\n" : " "}` : "",
        )
        .join("");
      pages.push(`[page ${number}]\n${tidy(text)}`);
    }
    const { info } = await pdf.getMetadata();
    const title = (info as { Title?: unknown }).Title;
    return {
      text: pages.join("\n"),
      title: typeof title === "string" && title.trim() ? title.trim() : null,
    };
  } finally {
    await pdf.loadingTask.destroy();
  }
}

/** The "[page N]" pages that contain any keyword, markers kept; null if none. */
export function pagesMentioning(
  text: string,
  keywords: readonly string[],
): string | null {
  const pages = text
    .split(/(?=^\[page \d+\]$)/m)
    .filter((page) => keywords.some((keyword) => page.includes(keyword)));
  return pages.length > 0 ? pages.join("\n").replace(/\n{2,}/g, "\n") : null;
}

const SKIPPED_ELEMENTS = new Set([
  "script",
  "style",
  "noscript",
  "template",
  "svg",
]);
const BLOCK_ELEMENTS = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "br",
  "caption",
  "dd",
  "div",
  "dl",
  "dt",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "li",
  "main",
  "nav",
  "ol",
  "p",
  "pre",
  "section",
  "table",
  "tr",
  "ul",
]);

/** Visible text, one line per block and per table row, cells separated by " | ". */
export function htmlToText(html: string): DocumentText {
  const document = parse(html);
  const parts: string[] = [];
  let title: string | null = null;

  const walk = (node: Node) => {
    if (node.nodeName === "#text" && "value" in node) {
      parts.push(node.value);
      return;
    }
    if (node.nodeName === "title" && "childNodes" in node) {
      title = textOf(node).trim() || null;
      return;
    }
    if (SKIPPED_ELEMENTS.has(node.nodeName) || !("childNodes" in node)) return;
    const block = BLOCK_ELEMENTS.has(node.nodeName);
    if (block) parts.push("\n");
    node.childNodes.forEach(walk);
    if (node.nodeName === "td" || node.nodeName === "th") parts.push(" | ");
    if (block) parts.push("\n");
  };

  walk(document);
  return { text: tidy(parts.join("")), title };
}

function textOf(node: Node): string {
  if (node.nodeName === "#text" && "value" in node) return node.value;
  return "childNodes" in node ? node.childNodes.map(textOf).join("") : "";
}

function tidy(text: string): string {
  return text
    .replace(/[ \t\u00a0]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}
