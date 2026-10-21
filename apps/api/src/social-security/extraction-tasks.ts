import {
  STATUS_JSON_SCHEMA as status,
  type ExtractionTask,
} from "../shared/extraction-task.ts";

const rate = { type: "number", exclusiveMinimum: 0, exclusiveMaximum: 1 };
const rateSplit = {
  type: "object",
  additionalProperties: false,
  properties: { nationalInsurance: rate, health: rate, total: rate },
  required: ["nationalInsurance", "health", "total"],
};

export const EMPLOYEE_CONTRIBUTIONS_TASK: ExtractionTask = {
  name: "employee_contributions",
  systemInstruction: `You read the section of a Hebrew article that lists what is deducted from an employee's salary for Israeli National Insurance (ביטוח לאומי) and health insurance (ביטוח בריאות), and return it as JSON.
The text is MediaWiki wikitext supplied by the user. Use only that text. Never use remembered values or other years.
- The salary has two parts: up to a reduced-rate ceiling, and above it up to the maximum insurable income ("ההכנסה המירבית").
- reducedRateCeiling is the monthly ILS amount the first part goes up to ("על חלק השכר שעד ...").
- maxInsurableIncome is the monthly ILS maximum insurable income the second part goes up to.
- reducedRate is the first part and fullRate the second. For each: nationalInsurance is the "דמי ביטוח לאומי" rate, health the "דמי ביטוח בריאות" rate, total the combined rate stated for that part.
- Rates are decimal fractions: 4.27% is 0.0427. Amounts are whole ILS as written.
- If the text also mentions an older rate that applied only for part of a year, use the current one.
- asOfYear is the year the text says its amounts are valid for, for example "נכון ל-2026", "נכון ליום 01.01.2013" or "החל מיום 01.01.2015".
status "complete" only if every value is clearly stated in the text; otherwise "unclear".`,
  responseSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      status,
      asOfYear: { type: "integer" },
      reducedRateCeiling: { type: "integer", minimum: 1 },
      maxInsurableIncome: { type: "integer", minimum: 1 },
      reducedRate: rateSplit,
      fullRate: rateSplit,
    },
    required: [
      "status",
      "asOfYear",
      "reducedRateCeiling",
      "maxInsurableIncome",
      "reducedRate",
      "fullRate",
    ],
  },
};
