import { TableCell } from "@mui/material";

import { WorkPayMap } from "@/domain";
import { computeTotalPay, formatValue } from "@/utils";

type PayBreakdownRowProps = {
  breakdown: WorkPayMap;
  isFooter?: boolean;
  emptyStartCells?: number;
};

export const PayBreakdownRow = ({
  breakdown,
  isFooter = false,
  emptyStartCells = 0,
}: PayBreakdownRowProps) => {
  const salary = computeTotalPay(breakdown);

  const cellSx = isFooter ? undefined : { minWidth: "90px" };

  return (
    <>
      {[...Array(emptyStartCells)].map((_, i) => (
        <TableCell key={`empty-${i}`} align="center" />
      ))}
      <TableCell>{formatValue(breakdown.totalHours)}</TableCell>
      <TableCell sx={cellSx}>
        {formatValue(breakdown.regular.hours100.hours)}
      </TableCell>
      <TableCell sx={cellSx}>
        {formatValue(breakdown.regular.hours125.hours)}
      </TableCell>
      <TableCell sx={cellSx}>
        {formatValue(breakdown.regular.hours150.hours)}
      </TableCell>

      <TableCell sx={cellSx}>
        {formatValue(breakdown.special.shabbat150.hours)}
      </TableCell>
      <TableCell sx={cellSx}>
        {formatValue(breakdown.special.shabbat200.hours)}
      </TableCell>
      <TableCell sx={cellSx}>
        {formatValue(breakdown.extra100Shabbat.hours)}
      </TableCell>

      <TableCell sx={cellSx}>
        {formatValue(breakdown.extra.hours20.hours)}
      </TableCell>
      <TableCell sx={cellSx}>
        {formatValue(breakdown.extra.hours50.hours)}
      </TableCell>

      <TableCell sx={cellSx}>
        {formatValue(breakdown.hours100Sick.hours)}
      </TableCell>
      <TableCell sx={cellSx}>
        {formatValue(breakdown.hours100Vacation.hours)}
      </TableCell>
      <TableCell sx={cellSx}>
        {formatValue(breakdown.perDiem?.diemInfo?.points ?? 0)}
      </TableCell>

      {breakdown.baseRate > 0 && (
        <TableCell sx={cellSx}>
          {salary > 0 ? `₪${formatValue(salary)}` : ""}
        </TableCell>
      )}
    </>
  );
};
