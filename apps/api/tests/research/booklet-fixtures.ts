import type { FetchedDocument } from "../../src/research/ports.ts";

export const BOOKLET_URL =
  "https://www.gov.il/BlobFolder/generalpage/income-tax-monthly-deductions-booklet/he/generalInformation_income-tax-monthly-deductions-booklet_monthly-deductions-booklet-2026.pdf";

/**
 * Short excerpt of pages 10 and 12 of the Israel Tax Authority's 2026 monthly
 * deductions booklet (BOOKLET_URL), as HttpDocumentFetcher converts it. Quoted
 * with the source for testing; the full document is not kept in the repo.
 */
export const BOOKLET_2026_TEXT = `[page 10]
10
פרק ב – שיעורי מס הכנסה
להלן שיעורי המס לשנת 2026 (לאחר חוק ריווח מדרגות מס הכנסה)
שיעורי המס החלים על הכנסה מיגיעה אישית ב - ₪
הכנסה שיעור הכנסה שיעור
חודשית המס שנתית המס
עד - 7,010 10% עד - 84,120 10%
מ - 7,011 עד - 10,060 14% מ - 84,121 עד - 120,720 14%
מ - 10,061 עד - 19,000 20% מ - 120,721 עד - 228,000 20%
מ - 19,001 עד - 25,100 31% מ - 228,001 עד - 301,200 31%
מ - 25,101 עד - 46,690 35% מ - 301,201 עד - 560,280 35%
מכל שקל נוסף 47% מכל שקל נוסף 47%
הכנסה שיעור הכנסה שיעור
חודשית המס שנתית המס
עד - 25,100 31% עד - 301,200 31%
מ - 25,101 עד - 46,690 35% מ - 301,201 עד - 560,280 35%
מכל שקל נוסף 47% מכל שקל נוסף 47%
[page 12]
12
פרק ג - סכומים מתואמים לשנת המס 6 202
א. נקודת זיכוי
נקודת זיכוי 33 א 242 לחודש
ב. קופות גמל וקרנות השתלמות`;

export const BRACKET_ROWS = `עד - 7,010 10% עד - 84,120 10%
מ - 7,011 עד - 10,060 14% מ - 84,121 עד - 120,720 14%
מ - 10,061 עד - 19,000 20% מ - 120,721 עד - 228,000 20%
מ - 19,001 עד - 25,100 31% מ - 228,001 עד - 301,200 31%
מ - 25,101 עד - 46,690 35% מ - 301,201 עד - 560,280 35%
מכל שקל נוסף 47% מכל שקל נוסף 47%`;

export const BRACKETS_2026 = [
  { minIncome: 0, maxIncome: 7010, taxRate: 0.1 },
  { minIncome: 7011, maxIncome: 10060, taxRate: 0.14 },
  { minIncome: 10061, maxIncome: 19000, taxRate: 0.2 },
  { minIncome: 19001, maxIncome: 25100, taxRate: 0.31 },
  { minIncome: 25101, maxIncome: 46690, taxRate: 0.35 },
  { minIncome: 46691, maxIncome: null, taxRate: 0.47 },
];

/** The answer gemma-4-31b-it gave for the 2026 booklet (live, 2026-10-20). */
export const ANSWER_2026 = {
  status: "complete",
  monthlyBrackets: {
    brackets: BRACKETS_2026,
    effectiveFrom: "2026-01-01",
    // Models drop spaces around dashes; the validator ignores whitespace.
    quote: BRACKET_ROWS.replaceAll(" - ", "-"),
    section: "פרק ב – שיעורי מס הכנסה",
    sourceReference: "page 10",
  },
  monthlyCreditPoint: {
    value: 242,
    effectiveFrom: "2026-01-01",
    quote: "נקודת זיכוי 33 א 242 לחודש",
    section: "פרק ג - סכומים מתואמים לשנת המס 6 202",
    sourceReference: "page 12",
  },
};

export function fetchedDocument(
  overrides: Partial<FetchedDocument> = {},
): FetchedDocument {
  return {
    requestedUrl: BOOKLET_URL,
    finalUrl: BOOKLET_URL,
    httpStatus: 200,
    contentType: "application/pdf",
    publisher: "www.gov.il",
    title: "לוח ניכויים חודשי ינואר 2025",
    retrievedAt: "2026-10-20T12:00:00.000Z",
    sha256: "a".repeat(64),
    accessibility: "accessible",
    problem: null,
    format: "pdf-text",
    text: BOOKLET_2026_TEXT,
    bytes: null,
    ...overrides,
  };
}
