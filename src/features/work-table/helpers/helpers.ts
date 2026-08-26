import { Theme } from "@mui/material";
import { SystemStyleObject } from "@mui/system";
import { TableHeader, TableViewMode, WorkDayMap } from "@/domain";

/**
 * Filters headers based on the current view mode
 */
export const filterHeadersByViewMode = (
  headers: TableHeader[],
  currentMode: TableViewMode,
): TableHeader[] => {
  return headers.filter((header) => {
    const headerMode = header.viewMode ?? "both";
    return headerMode === "both" || headerMode === currentMode;
  });
};

export const baseCellSx = (isFooter: boolean): SystemStyleObject<Theme> => ({
  textAlign: "center",
  verticalAlign: "middle",
  ...(isFooter ? {} : { minWidth: "90px" }),
});

export const rightBorderIfNotFooter = (
  isFooter: boolean,
): SystemStyleObject<Theme> => ({
  ...(isFooter ? {} : { borderRight: "1px solid black" }),
});

/**
 * Total number of <td> columns WorkTableHeader actually renders for a given
 * mode — the single source of truth for the details row's colSpan, instead
 * of a hand-maintained constant that silently drifts if a column is added
 * or removed from headersTable or from the baseRate/details columns
 * WorkTableHeader appends on top of it.
 */
export const countTableColumns = (
  headers: TableHeader[],
  viewMode: TableViewMode,
  baseRate: number,
): number => {
  const filtered = filterHeadersByViewMode(headers, viewMode);
  const headerColumns = filtered.reduce(
    (sum, header) => sum + (header.children?.length ?? 1),
    0,
  );
  const salaryColumn = baseRate > 0 ? 1 : 0;
  const detailsColumn = viewMode === "compact" ? 1 : 0;

  return headerColumns + salaryColumn + detailsColumn;
};

export const isSameDayPayMap = (a: WorkDayMap, b: WorkDayMap) => {
  return (
    a.totalHours === b.totalHours &&
    a.perDiem.diemInfo.amount === b.perDiem.diemInfo.amount &&
    JSON.stringify(a.workMap) === JSON.stringify(b.workMap)
  );
};
