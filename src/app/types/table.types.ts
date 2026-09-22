export type TableViewMode = "compact" | "both";

export type TableHeader = {
  label: string;
  viewMode: TableViewMode;
  children?: string[];
  rowSpan?: number;
  widths?: number[];
};
