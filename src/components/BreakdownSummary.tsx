import { TableCell } from "@mui/material";

import { WorkDayPayMap } from "@/models";
import { formatValue } from "@/utility";

type BreakdownSummaryProps = {
  breakdown: WorkDayPayMap | null;
  baseRate: number;
};

export const BreakdownSummary = ({
  breakdown,
  baseRate,
}: BreakdownSummaryProps) => {
  return (
    <>
      <TableCell sx={{ borderRight: "1px solid #ddd" }} align="center">
        {formatValue(breakdown?.totalHours)}
      </TableCell>

      <TableCell
        sx={{ borderRight: "1px solid #ddd", minWidth: "90px" }}
        align="center"
      >
        {formatValue(breakdown?.regular.hours100.hours)}
      </TableCell>
      <TableCell align="center" sx={{ minWidth: "90px" }}>
        {formatValue(breakdown?.regular.hours125.hours)}
      </TableCell>
      <TableCell align="center" sx={{ minWidth: "90px" }}>
        {formatValue(breakdown?.regular.hours150.hours)}
      </TableCell>

      <TableCell
        sx={{
          borderRight: "1px solid #ddd",
          minWidth: "90px",
          textAlign: "center",
        }}
        align="center"
      >
        {formatValue(breakdown?.special.shabbat150.hours)}
      </TableCell>
      <TableCell align="center" sx={{ minWidth: "90px", textAlign: "center" }}>
        {formatValue(breakdown?.special.shabbat200.hours)}
      </TableCell>

      <TableCell
        sx={{ borderRight: "1px solid #ddd", minWidth: "90px" }}
        align="center"
      >
        {formatValue(breakdown?.special.extra100Shabbat.hours)}
      </TableCell>
      <TableCell align="center" sx={{ minWidth: "90px" }}>
        {formatValue(breakdown?.regular.hours20.hours)}
      </TableCell>
      <TableCell align="center" sx={{ minWidth: "90px" }}>
        {formatValue(breakdown?.regular.hours50.hours)}
      </TableCell>

      <TableCell
        sx={{ borderRight: "1px solid #ddd", minWidth: "90px" }}
        align="center"
      >
        {formatValue(breakdown?.hours100Sick.hours)}
      </TableCell>
      <TableCell
        sx={{ borderRight: "1px solid #ddd", minWidth: "90px" }}
        align="center"
      >
        {formatValue(breakdown?.hours100Vacation.hours)}
      </TableCell>

      {baseRate > 0 && (
        <TableCell
          sx={{ borderRight: "1px solid #ddd", minWidth: "90px" }}
          align="center"
        >
          {breakdown?.totalPay && breakdown.totalPay > 0
            ? `₪${breakdown.totalPay.toFixed(2)}`
            : ""}
        </TableCell>
      )}
    </>
  );
};
