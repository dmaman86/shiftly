import { TableCell, TableFooter, TableRow } from "@mui/material";

import { WorkDayPayMap } from "@/models";

type FooterSummaryProps = {
  globalBreakdown: WorkDayPayMap;
  baseRate: number;
};

export const FooterSummary = ({
  globalBreakdown,
  baseRate,
}: FooterSummaryProps) => {
  const formatHours = (value: number): string => {
    const fixed = value.toFixed(2);
    return fixed === "-0.00" ? "0.00" : fixed;
  };

  return (
    <TableFooter>
      <TableRow
        sx={{
          position: "sticky",
          bottom: 0,
          backgroundColor: "#f0f0f0",
          zIndex: 2,
          fontWeight: "bold",
        }}
      >
        <TableCell colSpan={3} align="center"></TableCell>
        <TableCell align="center">
          {formatHours(globalBreakdown.totalHours)}
        </TableCell>
        <TableCell align="center">
          {formatHours(globalBreakdown.regular.hours100.hours)}
        </TableCell>
        <TableCell align="center">
          {formatHours(globalBreakdown.regular.hours125.hours)}
        </TableCell>
        <TableCell align="center">
          {formatHours(globalBreakdown.regular.hours150.hours)}
        </TableCell>
        <TableCell align="center">
          {formatHours(globalBreakdown.special.shabbat150.hours)}
        </TableCell>
        <TableCell align="center">
          {formatHours(globalBreakdown.special.shabbat200.hours)}
        </TableCell>
        <TableCell align="center">
          {formatHours(globalBreakdown.special.extra100Shabbat.hours)}
        </TableCell>
        <TableCell align="center">
          {formatHours(globalBreakdown.regular.hours20.hours)}
        </TableCell>
        <TableCell align="center">
          {formatHours(globalBreakdown.regular.hours50.hours)}
        </TableCell>
        <TableCell align="center">
          {formatHours(globalBreakdown.hours100Sick?.hours)}
        </TableCell>
        <TableCell align="center">
          {formatHours(globalBreakdown.hours100Vacation?.hours)}
        </TableCell>
        {baseRate > 0 && (
          <TableCell align="center">
            ₪{globalBreakdown.totalPay.toFixed(2)}
          </TableCell>
        )}
      </TableRow>
    </TableFooter>
  );
};
