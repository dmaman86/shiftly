import { describe, expect, it } from "vitest";
import {
  htmlToText,
  pagesMentioning,
} from "../../src/research/document-text.ts";

describe("htmlToText", () => {
  it("keeps visible text, one line per table row with separated cells", () => {
    const html = `<html><head><title> מדרגות מס </title><style>p{}</style></head>
<body><script>var x = 1;</script><h2>מדרגות</h2>
<table><tr><td>10%</td><td>7,010</td></tr><tr><td>14%</td><td>10,060</td></tr></table>
<p>נקודת&nbsp;זיכוי <b>242</b></p></body></html>`;
    expect(htmlToText(html)).toEqual({
      title: "מדרגות מס",
      text: "מדרגות\n10% | 7,010 |\n14% | 10,060 |\nנקודת זיכוי 242",
    });
  });
});

describe("pagesMentioning", () => {
  const text =
    "[page 1]\ncover\n[page 2]\nמדרגות\n[page 3]\nother\n[page 4]\nנקודת זיכוי";

  it("keeps only the pages with a keyword, with their markers", () => {
    expect(pagesMentioning(text, ["מדרגות", "נקודת זיכוי"])).toBe(
      "[page 2]\nמדרגות\n[page 4]\nנקודת זיכוי",
    );
  });

  it("returns null when no page mentions a keyword", () => {
    expect(pagesMentioning(text, ["מס יסף"])).toBeNull();
  });
});
