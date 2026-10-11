import type workTable from "@/i18n/locales/en/work-table.json";

export type TableViewMode = "compact" | "both";

export type TableHeaderLabel =
  keyof typeof workTable.headers | "" | `${number}%`;

export type TableHeader = {
  label: TableHeaderLabel;
  viewMode: TableViewMode;
  children?: TableHeaderLabel[];
  rowSpan?: number;
  widths?: number[];
};
