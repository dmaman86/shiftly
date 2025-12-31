import { useMemo } from "react";
import { TableCell } from "@mui/material";

import { PayBreakdownViewModel } from "@/domain";
import { computeTotalPay, formatValue } from "@/utils";
import { baseCellSx, rightBorderIfNotFooter } from "./helper.rows";

type ExpandedDayRowProps = {
  breakdown: PayBreakdownViewModel;
  baseRate: number;
  isFooter?: boolean;
  emptyStartCells?: number;
};

export const ExpandedDayRow = ({
  breakdown,
  baseRate,
  isFooter = false,
  emptyStartCells = 0,
}: ExpandedDayRowProps) => {
  const salary = useMemo(() => {
    return computeTotalPay(breakdown, baseRate);
  }, [baseRate, breakdown]);

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
      <TableCell sx={{ ...baseCellSx(isFooter) }}>
        {formatValue(breakdown.regular.hours100.hours)}
      </TableCell>
      <TableCell sx={{ ...baseCellSx(isFooter) }}>
        {formatValue(breakdown.regular.hours125.hours)}
      </TableCell>
      <TableCell
        sx={{ ...baseCellSx(isFooter), ...rightBorderIfNotFooter(isFooter) }}
      >
        {formatValue(breakdown.regular.hours150.hours)}
      </TableCell>

      <TableCell sx={{ ...baseCellSx(isFooter) }}>
        {formatValue(breakdown.special.shabbat150.hours)}
      </TableCell>
      <TableCell
        sx={{ ...baseCellSx(isFooter), ...rightBorderIfNotFooter(isFooter) }}
      >
        {formatValue(breakdown.special.shabbat200.hours)}
      </TableCell>
      <TableCell sx={{ ...baseCellSx(isFooter) }}>
        {formatValue(breakdown.extra100Shabbat.hours)}
      </TableCell>

      <TableCell sx={{ ...baseCellSx(isFooter) }}>
        {formatValue(breakdown.extra.hours20.hours)}
      </TableCell>
      <TableCell
        sx={{ ...baseCellSx(isFooter), ...rightBorderIfNotFooter(isFooter) }}
      >
        {formatValue(breakdown.extra.hours50.hours)}
      </TableCell>

      <TableCell sx={{ ...baseCellSx(isFooter) }}>
        {formatValue(breakdown.hours100Sick.hours)}
      </TableCell>
      <TableCell
        sx={{ ...baseCellSx(isFooter), ...rightBorderIfNotFooter(isFooter) }}
      >
        {formatValue(breakdown.hours100Vacation.hours)}
      </TableCell>
      <TableCell
        sx={{ ...baseCellSx(isFooter), ...rightBorderIfNotFooter(isFooter) }}
      >
        {formatValue(breakdown.perDiemPoints)}
      </TableCell>

      <TableCell sx={{ ...baseCellSx(isFooter) }}>
        {formatValue(breakdown.largePoints)}
      </TableCell>

      <TableCell
        sx={{ ...baseCellSx(isFooter), ...rightBorderIfNotFooter(isFooter) }}
      >
        {formatValue(breakdown.smallPoints)}
      </TableCell>

      {baseRate > 0 && (
        <TableCell
          sx={{ ...baseCellSx(isFooter), ...rightBorderIfNotFooter(isFooter) }}
        >
          {salary > 0 ? `₪${formatValue(salary)}` : ""}
        </TableCell>
      )}
    </>
  );
};
