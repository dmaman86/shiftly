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

export const isSameDayPayMap = (a: WorkDayMap, b: WorkDayMap) => {
  return (
    a.totalHours === b.totalHours &&
    a.perDiem.diemInfo.amount === b.perDiem.diemInfo.amount &&
    JSON.stringify(a.workMap) === JSON.stringify(b.workMap)
  );
};
