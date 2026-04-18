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

export const SYSTEM_START_YEAR = 2015;

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
  { label: "יום", viewMode: "both", rowSpan: 2 },
  { label: "", children: ["מחלה", "חופש"], widths: [48, 48], viewMode: "both" },
  {
    label: "שעות",
    children: ["", "כניסה", "יציאה", ""],
    widths: [48, 96, 96, 120],
    viewMode: "both",
  },
  { label: "סך שעות", rowSpan: 2, viewMode: "both" },
  { label: "רגילות", rowSpan: 2, viewMode: "compact" },
  { label: "תוספות", rowSpan: 2, viewMode: "compact" },
  {
    label: "ש״נ",
    children: ["100%", "125%", "150%"],
    widths: [64, 64, 64],
    viewMode: "expanded",
  },
  {
    label: "שבת",
    children: ["150%", "200%"],
    widths: [64, 64],
    viewMode: "expanded",
  },
  {
    label: "תוספות",
    children: ["ז. שבת ", "20%", "50%"],
    widths: [64, 64, 64],
    viewMode: "expanded",
  },
  {
    label: "היעדרות",
    children: ["מחלה", "חופש"],
    widths: [64, 64],
    viewMode: "expanded",
  },
  {
    label: "אש״ל",
    rowSpan: 2,
    viewMode: "expanded",
  },
  {
    label: "כלכלה",
    children: ["גדולה", "קטנה"],
    widths: [64, 64],
    viewMode: "expanded",
  },
];

// Maps hebcal API English names → normalized i18n keys (used in work-table.json holidays.*)
export const holidayKeyMap = {
  "Rosh Hashana": "rosh_hashana",
  "Rosh Hashana II": "rosh_hashana_2",
  "Yom Kippur": "yom_kippur",
  "Sukkot I": "sukkot",
  "Shmini Atzeret": "shmini_atzeret",
  "Pesach I": "pesach",
  "Pesach VI (CH'M)": "pesach_6",
  "Pesach VII": "pesach_7",
  "Yom HaAtzma'ut": "yom_haatzmaut",
  "Shavuot I": "shavuot",
  "Erev Rosh Hashana": "erev_rosh_hashana",
  "Erev Yom Kippur": "erev_yom_kippur",
  "Erev Sukkot": "erev_sukkot",
  "Erev Pesach": "erev_pesach",
  "Erev Shavuot": "erev_shavuot",
  "Yom HaZikaron": "yom_hazikaron",
  "Sukkot VII (Hoshana Rabba)": "hoshana_rabba",
} as const;

export type HolidayKey = (typeof holidayKeyMap)[keyof typeof holidayKeyMap];

export const hebrewHolidayNames: Record<string, string> = {
  "Rosh Hashana": "ראש השנה",
  "Rosh Hashana II": "ראש השנה ב׳",
  "Yom Kippur": "יום כיפור",
  "Sukkot I": "סוכות",
  "Shmini Atzeret": "שמיני עצרת",
  "Pesach I": "פסח",
  "Pesach VI (CH'M)": "ערב שביעי של פסח",
  "Pesach VII": "שביעי של פסח",
  "Yom HaAtzma'ut": "יום העצמאות",
  "Shavuot I": "שבועות",
  "Erev Rosh Hashana": "ערב ראש השנה",
  "Erev Yom Kippur": "ערב יום כיפור",
  "Erev Sukkot": "ערב סוכות",
  "Erev Pesach": "ערב פסח",
  "Erev Shavuot": "ערב שבועות",
  "Yom HaZikaron": "יום הזיכרון",
  "Sukkot VII (Hoshana Rabba)": "הושענא רבה",
};

export const baseLabels = ["100%", "שבת תוספת 100%", "מחלה", "חופש"];
export const extraLabels = [
  "תוספת לילה (50%)",
  "150%",
  "125%",
  "שבת 150%",
  "שבת 200%",
  "תוספת ערב (20%)",
];
