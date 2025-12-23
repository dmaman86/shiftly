import { TableCell } from "@mui/material";

import { PayBreakdownViewModel } from "@/domain";
import { computeTotalPay, formatValue } from "@/utils";
import { useMemo } from "react";

type PayBreakdownRowProps = {
  breakdown: PayBreakdownViewModel;
  baseRate: number;
  isFooter?: boolean;
  emptyStartCells?: number;
};

export const PayBreakdownRow = ({
  breakdown,
  baseRate,
  isFooter = false,
  emptyStartCells = 0,
}: PayBreakdownRowProps) => {
  const salary = useMemo(() => {
    return computeTotalPay(breakdown, baseRate);
  }, [baseRate, breakdown]);

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
      <TableCell sx={cellSx}>{formatValue(breakdown.perDiemPoints)}</TableCell>

      <TableCell sx={cellSx}>{formatValue(breakdown.largePoints)}</TableCell>

      <TableCell sx={cellSx}>{formatValue(breakdown.smallPoints)}</TableCell>

      {baseRate > 0 && (
        <TableCell sx={cellSx}>
          {salary > 0 ? `₪${formatValue(salary)}` : ""}
        </TableCell>
      )}
    </>
  );
};
