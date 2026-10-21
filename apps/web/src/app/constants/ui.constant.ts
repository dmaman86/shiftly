import type { TableHeader } from "@/app/types/table.types";

export { SYSTEM_START_YEAR } from "@shiftly/domain";

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
    label: "day",
    widths: [tableColumnWidths.day],
    viewMode: "both",
    rowSpan: 2,
  },
  {
    label: "",
    children: ["sick", "vacation"],
    widths: [tableColumnWidths.sickVacation, tableColumnWidths.sickVacation],
    viewMode: "both",
  },
  {
    label: "hours",
    children: ["", "entry", "exit", ""],
    widths: [
      tableColumnWidths.addShift,
      tableColumnWidths.entry,
      tableColumnWidths.exit,
      tableColumnWidths.actions,
    ],
    viewMode: "both",
  },
  {
    label: "actual_hours",
    widths: [tableColumnWidths.compactStat],
    viewMode: "both",
    rowSpan: 2,
  },
  {
    label: "total_hours",
    widths: [tableColumnWidths.compactStat],
    viewMode: "both",
    rowSpan: 2,
  },
  {
    label: "regular",
    widths: [tableColumnWidths.compactStat],
    viewMode: "compact",
    rowSpan: 2,
  },
  {
    label: "extras",
    widths: [tableColumnWidths.compactStat],
    viewMode: "compact",
    rowSpan: 2,
  },
];
