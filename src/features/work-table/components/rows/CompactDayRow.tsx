import { TableCell } from "@mui/material";
import { formatValue } from "@/utils";
import { CompactPayBreakdownVM } from "@/domain";
import { baseCellSx, rightBorderIfNotFooter } from "../../helpers";

type CompactDayRowProps = {
  breakdown: CompactPayBreakdownVM;
  isFooter?: boolean;
  emptyStartCells?: number;
  rowSpan?: number;
};

export const CompactDayRow = ({
  breakdown,
  isFooter = false,
  emptyStartCells = 0,
  rowSpan,
}: CompactDayRowProps) => {
  return (
    <>
      {[...Array(emptyStartCells)].map((_, i) => (
        <TableCell key={`empty-${i}`} align="center" rowSpan={rowSpan} />
      ))}
      <TableCell
        rowSpan={rowSpan}
        sx={{ ...baseCellSx(isFooter), ...rightBorderIfNotFooter(isFooter) }}
      >
        {formatValue(breakdown.totalHours)}
      </TableCell>
      <TableCell
        rowSpan={rowSpan}
        sx={{ ...baseCellSx(isFooter), ...rightBorderIfNotFooter(isFooter) }}
      >
        {formatValue(breakdown.regularHours)}
      </TableCell>
      <TableCell
        rowSpan={rowSpan}
        sx={{ ...baseCellSx(isFooter), ...rightBorderIfNotFooter(isFooter) }}
      >
        {formatValue(breakdown.extraHours)}
      </TableCell>
      {breakdown.dailySalary !== undefined && (
        <TableCell
          rowSpan={rowSpan}
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
