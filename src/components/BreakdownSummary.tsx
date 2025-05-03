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
  const formatHours = (hours: number | null | undefined) => {
    if (breakdown === null) return "";
    if (hours === null || hours === undefined || hours === 0) return "";
    return hours.toFixed(2);
  };

  const calculateDailySalary = (
    breakdown: WorkDayPayMap | null,
    baseRate: number,
  ): number => {
    if (!breakdown) return 0;

    const { regular, special, hours100Sick, hours100Vacation } = breakdown;

    const allSegments = [
      ...Object.values(regular),
      ...Object.values(special),
      hours100Sick,
      hours100Vacation,
    ];

    return allSegments.reduce(
      (sum, seg) => sum + seg.hours * seg.percent * baseRate,
      0,
    );
  };

  return (
    <>
      <TableCell sx={{ borderRight: "1px solid #ddd" }}>
        {formatHours(breakdown?.totalHours)}
      </TableCell>
      <TableCell sx={{ borderRight: "1px solid #ddd" }}>
        {formatHours(breakdown?.regular.hours100.hours)}
      </TableCell>
      <TableCell sx={{ borderRight: "1px solid #ddd" }}>
        {formatHours(breakdown?.regular.hours125.hours)}
      </TableCell>
      <TableCell sx={{ borderRight: "1px solid #ddd" }}>
        {formatHours(breakdown?.regular.hours150.hours)}
      </TableCell>
      <TableCell sx={{ borderRight: "1px solid #ddd" }}>
        {formatHours(breakdown?.special.shabbat150.hours)}
      </TableCell>
      <TableCell sx={{ borderRight: "1px solid #ddd" }}>
        {formatHours(breakdown?.special.shabbat200.hours)}
      </TableCell>
      <TableCell sx={{ borderRight: "1px solid #ddd" }}>
        {formatHours(breakdown?.special.extra100Shabbat.hours)}
      </TableCell>
      <TableCell sx={{ borderRight: "1px solid #ddd" }}>
        {formatHours(breakdown?.regular.hours20.hours)}
      </TableCell>
      <TableCell sx={{ borderRight: "1px solid #ddd" }}>
        {formatHours(breakdown?.regular.hours50.hours)}
      </TableCell>
      <TableCell sx={{ borderRight: "1px solid #ddd" }}>
        {formatHours(breakdown?.hours100Sick.hours)}
      </TableCell>
      <TableCell sx={{ borderRight: "1px solid #ddd" }}>
        {formatHours(breakdown?.hours100Vacation.hours)}
      </TableCell>
      {baseRate > 0 && (
        <TableCell sx={{ borderRight: "1px solid #ddd" }}>
          {formatHours(calculateDailySalary(breakdown, baseRate))}
        </TableCell>
      )}
    </>
  );
};
