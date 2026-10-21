import { describe, expect, it } from "vitest";
import { locateQuote, referencedPage } from "../../src/research/evidence.ts";

const CONTENT = `[page 3]
intro
[page 4]
נקודת זיכוי 33 א 242 לחודש
מ - 7,011 עד - 10,060 14%`;

describe("locateQuote", () => {
  it("returns the passage as it is in the content, with its page", () => {
    expect(locateQuote(CONTENT, "נקודת זיכוי 33א 242 לחודש")).toEqual({
      span: "נקודת זיכוי 33 א 242 לחודש",
      page: 4,
    });
  });

  it("ignores whitespace and swapped dashes", () => {
    expect(locateQuote(CONTENT, "מ–7,011 עד–10,060 14%")?.span).toBe(
      "מ - 7,011 עד - 10,060 14%",
    );
  });

  it("does not match changed digits", () => {
    expect(locateQuote(CONTENT, "נקודת זיכוי 33 א 243 לחודש")).toBeNull();
  });

  it("rejects quotes too short to prove anything", () => {
    expect(locateQuote(CONTENT, "242 לחודש")).toBeNull();
  });

  it("has no page for content without page markers", () => {
    expect(locateQuote("a table row with 7,010 10%", "row with 7,010")).toEqual(
      {
        span: "row with 7,010",
        page: null,
      },
    );
  });

  it("treats regex characters in the quote literally", () => {
    expect(
      locateQuote("rates (10%) [a] *b* $1", "(10%) [a] *b* $1")?.span,
    ).toBe("(10%) [a] *b* $1");
  });
});

describe("referencedPage", () => {
  it.each([
    ["page 10", 10],
    ["Page 12, section A", 12],
    ["p. 7", 7],
    ["עמוד 4", 4],
    ["פרק ב", null],
  ])("%s → %s", (reference, page) => {
    expect(referencedPage(reference)).toBe(page);
  });
});
