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

/**
 * Single source of truth for the work table's column widths — read by
 * WorkTableHeader (via headersTable's `widths` below) and by the body row
 * components (DayRow, ShiftRow, CompactDayRow) that render the matching
 * cells, so the header and body can't silently drift out of sync the way
 * they previously did (header defaulted to a generic width while each body
 * cell hardcoded its own number separately).
 */
export const tableColumnWidths = {
  day: 96,
  sickVacation: 50,
  addShift: 48,
  entry: 96,
  exit: 96,
  actions: 112,
  compactStat: 90,
} as const;

export const headersTable: TableHeader[] = [
  {
    label: "יום",
    widths: [tableColumnWidths.day],
    viewMode: "both",
    rowSpan: 2,
  },
  {
    label: "",
    children: ["מחלה", "חופש"],
    widths: [tableColumnWidths.sickVacation, tableColumnWidths.sickVacation],
    viewMode: "both",
  },
  {
    label: "שעות",
    children: ["", "כניסה", "יציאה", ""],
    widths: [
      tableColumnWidths.addShift,
      tableColumnWidths.entry,
      tableColumnWidths.exit,
      tableColumnWidths.actions,
    ],
    viewMode: "both",
  },
  {
    label: "סך שעות בפועל",
    widths: [tableColumnWidths.compactStat],
    viewMode: "both",
    rowSpan: 2,
  },
  {
    label: "סך שעות לתשלום",
    widths: [tableColumnWidths.compactStat],
    viewMode: "both",
    rowSpan: 2,
  },
  {
    label: "רגילות",
    widths: [tableColumnWidths.compactStat],
    viewMode: "compact",
    rowSpan: 2,
  },
  {
    label: "תוספות",
    widths: [tableColumnWidths.compactStat],
    viewMode: "compact",
    rowSpan: 2,
  },
];

export type HolidayKey =
  | "rosh_hashana"
  | "rosh_hashana_2"
  | "yom_kippur"
  | "sukkot"
  | "shmini_atzeret"
  | "pesach"
  | "pesach_6"
  | "pesach_7"
  | "yom_haatzmaut"
  | "shavuot"
  | "erev_rosh_hashana"
  | "erev_yom_kippur"
  | "erev_sukkot"
  | "erev_pesach"
  | "erev_shavuot"
  | "yom_hazikaron"
  | "hoshana_rabba";

export const baseLabels = ["100%", "שבת תוספת 100%", "מחלה", "חופש"];
export const extraLabels = [
  "תוספת לילה (50%)",
  "150%",
  "125%",
  "שבת 150%",
  "שבת 200%",
  "תוספת ערב (20%)",
];
