import { TableCell } from "@mui/material";

import { WorkDayPayMap } from "@/models";

type BreakdownSummaryProps = {
  breakdown: WorkDayPayMap | null;
  baseRate: number;
};

export const BreakdownSummary = ({
  breakdown,
  baseRate,
}: BreakdownSummaryProps) => {
  const formatHours = (value: number | null | undefined) => {
    if (breakdown === null) return "";
    if (value === null || value === undefined || value === 0) return "";
    return value.toFixed(2);
  };

  return (
    <>
      <TableCell sx={{ borderRight: "1px solid #ddd" }} align="center">
        {formatHours(breakdown?.totalHours)}
      </TableCell>

      <TableCell sx={{ borderRight: "1px solid #ddd" }} align="center">
        {formatHours(breakdown?.regular.hours100.hours)}
      </TableCell>
      <TableCell align="center">
        {formatHours(breakdown?.regular.hours125.hours)}
      </TableCell>
      <TableCell align="center">
        {formatHours(breakdown?.regular.hours150.hours)}
      </TableCell>

      <TableCell sx={{ borderRight: "1px solid #ddd" }} align="center">
        {formatHours(breakdown?.special.shabbat150.hours)}
      </TableCell>
      <TableCell align="center">
        {formatHours(breakdown?.special.shabbat200.hours)}
      </TableCell>

      <TableCell sx={{ borderRight: "1px solid #ddd" }} align="center">
        {formatHours(breakdown?.special.extra100Shabbat.hours)}
      </TableCell>
      <TableCell align="center">
        {formatHours(breakdown?.regular.hours20.hours)}
      </TableCell>
      <TableCell align="center">
        {formatHours(breakdown?.regular.hours50.hours)}
      </TableCell>

      <TableCell sx={{ borderRight: "1px solid #ddd" }} align="center">
        {formatHours(breakdown?.hours100Sick.hours)}
      </TableCell>
      <TableCell sx={{ borderRight: "1px solid #ddd" }} align="center">
        {formatHours(breakdown?.hours100Vacation.hours)}
      </TableCell>

      {baseRate > 0 && (
        <TableCell sx={{ borderRight: "1px solid #ddd" }} align="center">
          {breakdown?.totalPay && breakdown.totalPay > 0
            ? `₪${breakdown.totalPay.toFixed(2)}`
            : ""}
        </TableCell>
      )}
    </>
  );
};
