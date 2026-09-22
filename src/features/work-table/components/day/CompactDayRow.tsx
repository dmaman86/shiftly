import { TableCell } from "@mui/material";
import { formatValue } from "@/utils";
import type { CompactPayBreakdownVM } from "@/app/types";
import { baseCellSx, rightBorderIfNotFooter } from "../../helpers";

type CompactDayRowProps = {
  breakdown: CompactPayBreakdownVM;
  isFooter?: boolean;
  emptyStartCells?: number;
  rowSpan?: number;
  testIdPrefix?: string;
};

export const CompactDayRow = ({
  breakdown,
  isFooter = false,
  emptyStartCells = 0,
  rowSpan,
  testIdPrefix,
}: CompactDayRowProps) => {
  return (
    <>
      {Array.from({ length: emptyStartCells }, (_, i) => i).map((n) => (
        <TableCell key={`empty-${n}`} align="center" rowSpan={rowSpan} />
      ))}
      <TableCell
        data-testid={testIdPrefix ? `${testIdPrefix}-actual-hours` : undefined}
        rowSpan={rowSpan}
        sx={{ ...baseCellSx(isFooter), ...rightBorderIfNotFooter(isFooter) }}
      >
        {formatValue(breakdown.actualHours)}
      </TableCell>
      <TableCell
        data-testid={testIdPrefix ? `${testIdPrefix}-total-hours` : undefined}
        rowSpan={rowSpan}
        sx={{ ...baseCellSx(isFooter), ...rightBorderIfNotFooter(isFooter) }}
      >
        {formatValue(breakdown.totalHours)}
      </TableCell>
      <TableCell
        data-testid={testIdPrefix ? `${testIdPrefix}-regular-hours` : undefined}
        rowSpan={rowSpan}
        sx={{ ...baseCellSx(isFooter), ...rightBorderIfNotFooter(isFooter) }}
      >
        {formatValue(breakdown.regularHours)}
      </TableCell>
      <TableCell
        data-testid={testIdPrefix ? `${testIdPrefix}-extra-hours` : undefined}
        rowSpan={rowSpan}
        sx={{ ...baseCellSx(isFooter), ...rightBorderIfNotFooter(isFooter) }}
      >
        {formatValue(breakdown.extraHours)}
      </TableCell>
      {breakdown.dailySalary !== undefined && (
        <TableCell
          data-testid={testIdPrefix ? `${testIdPrefix}-salary` : undefined}
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
