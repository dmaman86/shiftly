import {
  Table,
  TableBody,
  TableHead,
  TableRow,
  Typography,
  TableCell,
} from "@mui/material";
import { WorkDayPayMap } from "@/models";

type SalaryRow = {
  label: string;
  hours: number;
  percent: number;
  total: number;
};

type MonthlySalarySummaryProps = {
  baseRate: number;
  globalBreakdown: WorkDayPayMap;
};

const calculateSalaryPerCategory = (
  breakdown: WorkDayPayMap,
  baseRate: number,
) => {
  const salaryRows: {
    label: string;
    hours: number;
    percent: number;
    total: number;
  }[] = [];

  const addRow = (
    label: string,
    { hours, percent }: { hours: number; percent: number },
  ) => {
    if (hours > 0) {
      salaryRows.push({
        label,
        hours,
        percent,
        total: hours * percent * baseRate,
      });
    }
  };

  addRow("100%", breakdown.regular.hours100);
  addRow("125%", breakdown.regular.hours125);
  addRow("150%", breakdown.regular.hours150);
  addRow("תוספת ערב (20%)", breakdown.regular.hours20);
  addRow("תוספת לילה (50%)", breakdown.regular.hours50);

  addRow("שבת 150%", breakdown.special.shabbat150);
  addRow("שבת 200%", breakdown.special.shabbat200);
  addRow("שבת תוספת 100%", breakdown.special.extra100Shabbat);

  addRow("מחלה", breakdown.hours100Sick);
  addRow("חופש", breakdown.hours100Vacation);

  return salaryRows;
};

export const MonthlySalarySummary = ({
  baseRate,
  globalBreakdown,
}: MonthlySalarySummaryProps) => {
  const salaryRows: SalaryRow[] = calculateSalaryPerCategory(
    globalBreakdown,
    baseRate,
  );

  const total = salaryRows.reduce((sum, row) => sum + row.total, 0);

  const formatHours = (value: number): string => {
    const fixed = value.toFixed(2);
    return fixed === "-0.00" ? "0.00" : fixed;
  };

  return (
    <>
      <Typography variant="h6" gutterBottom>
        סיכום שכר חודשי לפי שעות:
      </Typography>
      <Table size="small" sx={{ direction: "rtl" }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: "bold" }}>סוג</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>כמות</TableCell>
            <TableCell sx={{ fontWeight: "bold" }}>שכר</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {salaryRows.map((row, index) => (
            <TableRow key={index}>
              <TableCell>{row.label}</TableCell>
              <TableCell>{formatHours(row.hours)}</TableCell>
              <TableCell>₪{formatHours(row.total)}</TableCell>
            </TableRow>
          ))}
          <TableRow sx={{ fontWeight: "bold", backgroundColor: "#f5f5f5" }}>
            <TableCell>סה״כ</TableCell>
            <TableCell />
            <TableCell>₪{formatHours(total)}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </>
  );
};
