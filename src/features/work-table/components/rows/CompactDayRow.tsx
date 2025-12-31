import { TableCell } from "@mui/material";
import { formatValue } from "@/utils";
import { CompactPayBreakdownVM } from "@/domain";
import { baseCellSx, rightBorderIfNotFooter } from "./helper.rows";

type CompactDayRowProps = {
  breakdown: CompactPayBreakdownVM;
  isFooter?: boolean;
  emptyStartCells?: number;
};

export const CompactDayRow = ({
  breakdown,
  isFooter = false,
  emptyStartCells = 0,
}: CompactDayRowProps) => {
  return (
    <>
      {[...Array(emptyStartCells)].map((_, i) => (
        <TableCell key={`empty-${i}`} align="center" />
      ))}
      <TableCell
        sx={{ ...baseCellSx(isFooter), ...rightBorderIfNotFooter(isFooter) }}
      >
        {formatValue(breakdown.totalHours)}
      </TableCell>
      <TableCell
        sx={{ ...baseCellSx(isFooter), ...rightBorderIfNotFooter(isFooter) }}
      >
        {formatValue(breakdown.regularHours)}
      </TableCell>
      <TableCell
        sx={{ ...baseCellSx(isFooter), ...rightBorderIfNotFooter(isFooter) }}
      >
        {formatValue(breakdown.extraHours)}
      </TableCell>
      {breakdown.dailySalary !== undefined && (
        <TableCell
          sx={{ ...baseCellSx(isFooter), ...rightBorderIfNotFooter(isFooter) }}
        >
          {breakdown.dailySalary > 0
            ? `₪${formatValue(breakdown.dailySalary)}`
            : ""}
        </TableCell>
      )}
    </>
  );
};
