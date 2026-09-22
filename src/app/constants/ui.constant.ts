import type { TableHeader } from "@/app/types/table.types";

export const SYSTEM_START_YEAR = 2015;

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
