import { TableHeader } from "@/domain";

export const fieldShiftPercent: Record<string, number> = {
  hours50: 0.5,
  hours20: 0.2,
  hours100: 1,
  hours125: 1.25,
  hours150: 1.5,
  hours200: 2,
};

export const fieldMinutes: Record<string, number> = {
  fullDay: 1440,
  minutes: 60,
  min06: 6 * 60,
  min14: 14 * 60,
  min17: 17 * 60,
  min18: 18 * 60,
  min22: 22 * 60,
};

export const regularFields = ["hours100", "hours125", "hours150"] as const;
export const extraFields = ["hours20", "hours50"] as const;
export const specialFields = ["shabbat150", "shabbat200"] as const;

export enum WorkDayStatus {
  normal = "normal",
  vacation = "vacation",
  sick = "sick",
}

export enum WorkDayType {
  Regular = "Regular",
  SpecialPartialStart = "SpecialPartialStart",
  SpecialFull = "SpecialFull",
}

export const headersTable: TableHeader[] = [
  { label: "יום", rowSpan: 2 },
  { label: "", children: ["מחלה", "חופש"] },
  { label: "שעות", rowSpan: 2 },
  { label: "סך שעות", rowSpan: 2 },
  {
    label: "ש״נ",
    children: ["100%", "125%", "150%"],
  },
  {
    label: "שבת",
    children: ["150%", "200%"],
  },
  {
    label: "תוספות",
    children: ["ז. שבת ", "20%", "50%"],
  },
  {
    label: "היעדרות",
    children: ["מחלה", "חופש"],
  },
  {
    label: "אש״ל",
    rowSpan: 2,
  },
  {
    label: "כלכלה",
    children: ["גדולה", "קטנה"],
  },
];

export const baseLabels = ["100%", "שבת תוספת 100%", "מחלה", "חופש"];
export const extraLabels = [
  "תוספת לילה (50%)",
  "150%",
  "125%",
  "שבת 150%",
  "שבת 200%",
  "תוספת ערב (20%)",
];
