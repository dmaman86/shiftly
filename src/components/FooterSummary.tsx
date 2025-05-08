import { TableCell, TableFooter, TableRow } from "@mui/material";

import { WorkDayPayMap } from "@/models";
import { formatValue } from "@/utility";

type FooterSummaryProps = {
  globalBreakdown: WorkDayPayMap;
  baseRate: number;
};

export const FooterSummary = ({
  globalBreakdown,
  baseRate,
}: FooterSummaryProps) => {
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
        <TableCell colSpan={4} align="center"></TableCell>
        <TableCell align="center">
          {formatValue(globalBreakdown.totalHours)}
        </TableCell>
        <TableCell align="center">
          {formatValue(globalBreakdown.regular.hours100.hours)}
        </TableCell>
        <TableCell align="center">
          {formatValue(globalBreakdown.regular.hours125.hours)}
        </TableCell>
        <TableCell align="center">
          {formatValue(globalBreakdown.regular.hours150.hours)}
        </TableCell>
        <TableCell align="center">
          {formatValue(globalBreakdown.special.shabbat150.hours)}
        </TableCell>
        <TableCell align="center">
          {formatValue(globalBreakdown.special.shabbat200.hours)}
        </TableCell>
        <TableCell align="center">
          {formatValue(globalBreakdown.special.extra100Shabbat.hours)}
        </TableCell>
        <TableCell align="center">
          {formatValue(globalBreakdown.regular.hours20.hours)}
        </TableCell>
        <TableCell align="center">
          {formatValue(globalBreakdown.regular.hours50.hours)}
        </TableCell>
        <TableCell align="center">
          {formatValue(globalBreakdown.hours100Sick.hours)}
        </TableCell>
        <TableCell align="center">
          {formatValue(globalBreakdown.hours100Vacation.hours)}
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
