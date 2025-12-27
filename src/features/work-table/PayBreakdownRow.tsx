import { TableCell, Theme } from "@mui/material";
import { SystemStyleObject } from "@mui/system";

import { PayBreakdownViewModel } from "@/domain";
import { computeTotalPay, formatValue } from "@/utils";
import { useMemo } from "react";

type PayBreakdownRowProps = {
  breakdown: PayBreakdownViewModel;
  baseRate: number;
  isFooter?: boolean;
  emptyStartCells?: number;
};

const baseCellSx = (isFooter: boolean): SystemStyleObject<Theme> => ({
  textAlign: "center",
  ...(isFooter ? {} : { minWidth: "90px" }),
});

const rightBorderIfNotFooter = (
  isFooter: boolean,
): SystemStyleObject<Theme> => ({
  ...(isFooter ? {} : { borderRight: "1px solid black" }),
});

export const PayBreakdownRow = ({
  breakdown,
  baseRate,
  isFooter = false,
  emptyStartCells = 0,
}: PayBreakdownRowProps) => {
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
