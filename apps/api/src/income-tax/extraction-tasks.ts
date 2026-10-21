import {
  STATUS_JSON_SCHEMA as status,
  type ExtractionTask,
} from "../shared/extraction-task.ts";

export const BRACKETS_TASK: ExtractionTask = {
  name: "brackets",
  systemInstruction: `You convert one Israeli income-tax bracket table into JSON.
The table is MediaWiki wikitext supplied by the user. Use only that text. Never use remembered values or other years.
- Each data row starts with its tax rate cell, for example '''10%'''.
- Use only the MONTHLY "הכנסה עד" column: the first amount after the rate, under "חודשי". Ignore the annual columns ("שנתי") and the tax columns ("מס למדרגה", "מס מצטבר").
- One bracket per data row, in table order. maxIncome is the monthly "הכנסה עד" amount as a whole number of ILS.
- The first bracket has minIncome 0. Every next bracket has minIncome = previous maxIncome + 1.
- The last row ("כל שקל נוסף") has maxIncome null.
- taxRate is a decimal fraction: 10% is 0.10.
status "complete" only if every row is clearly readable; otherwise "unclear".`,
  responseSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      status,
      monthlyBrackets: {
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
    },
    required: ["status", "monthlyBrackets"],
  },
};

export const CREDIT_POINT_TASK: ExtractionTask = {
  name: "credit_point",
  systemInstruction: `You convert a table of Israeli income-tax credit point values (נקודת זיכוי) into JSON.
The table is MediaWiki wikitext supplied by the user. Use only that text. Never use remembered values.
- One entry per data row, in table order.
- year is the value of the "שנה" column.
- monthlyValue is the ILS amount in the "ערך חודשי" column. Ignore "ערך שנתי" and the change columns.
- Never add, skip or merge years: the rows must match the table exactly.
status "complete" only if every row is clearly readable; otherwise "unclear".`,
  responseSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      status,
      rows: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            year: { type: "integer" },
            monthlyValue: { type: "number", exclusiveMinimum: 0 },
          },
          required: ["year", "monthlyValue"],
        },
      },
    },
    required: ["status", "rows"],
  },
};
