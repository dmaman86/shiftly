import {
  STATUS_JSON_SCHEMA as status,
  type ExtractionTask,
} from "../shared/extraction-task.ts";

const EVIDENCE_PROPERTIES = {
  effectiveFrom: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
  quote: { type: "string", minLength: 1 },
  section: { type: "string" },
  sourceReference: { type: "string" },
} as const;
const EVIDENCE_FIELDS = Object.keys(EVIDENCE_PROPERTIES);

/** Reads brackets and the credit point from any fetched document (PDF or web page). */
export function incomeTaxResearchTask(year: number): ExtractionTask {
  return {
    name: "income_tax_research",
    systemInstruction: `You read one document that a backend downloaded. It is text converted from a PDF or a web page: PDF text has "[page N]" markers and one table row per line; web page tables have one row per line with cells separated by "|".
Use only that text. Never use remembered values, other documents or other years.
Find, for tax year ${year}:
1. monthlyBrackets: the MONTHLY income tax brackets for an individual's income from personal exertion (הכנסה מיגיעה אישית).
   - Ignore annual (שנתית), daily (יומית) and non-exertion (שאינה מיגיעה אישית) tables.
   - One bracket per table row, in table order. maxIncome is the monthly upper limit in whole ILS; the last row ("כל שקל נוסף") has maxIncome null.
   - The first bracket has minIncome 0; every next bracket has minIncome = previous maxIncome + 1.
   - taxRate is a decimal fraction: 10% is 0.10.
   - Never add a surtax (מס נוסף, מס יסף) as a bracket.
2. monthlyCreditPoint: the monthly value in ILS of one credit point (נקודת זיכוי).
For each of the two:
   - quote: the passage that contains the values, copied exactly as it appears in the document, character by character. For the brackets, all of the table rows; for the credit point, the row or sentence with the value.
   - section: the heading the passage is under.
   - sourceReference: "page N" from the nearest preceding [page N] marker; for a web page, the heading.
   - effectiveFrom: the date (YYYY-MM-DD) from which the document says the values apply; ${year}-01-01 when it says they apply to tax year ${year}.
status "complete" only if the document clearly states both for tax year ${year}; otherwise "unclear".`,
    responseSchema: {
      type: "object",
      additionalProperties: false,
      properties: {
        status,
        monthlyBrackets: {
          type: "object",
          additionalProperties: false,
          properties: {
            brackets: {
              type: "array",
              items: {
                type: "object",
                additionalProperties: false,
                properties: {
                  minIncome: { type: "integer", minimum: 0 },
                  maxIncome: { type: ["integer", "null"], minimum: 1 },
                  taxRate: {
                    type: "number",
                    exclusiveMinimum: 0,
                    exclusiveMaximum: 1,
                  },
                },
                required: ["minIncome", "maxIncome", "taxRate"],
              },
            },
            ...EVIDENCE_PROPERTIES,
          },
          required: ["brackets", ...EVIDENCE_FIELDS],
        },
        monthlyCreditPoint: {
          type: "object",
          additionalProperties: false,
          properties: {
            value: { type: "number", exclusiveMinimum: 0 },
            ...EVIDENCE_PROPERTIES,
          },
          required: ["value", ...EVIDENCE_FIELDS],
        },
      },
      required: ["status", "monthlyBrackets", "monthlyCreditPoint"],
    },
  };
}
