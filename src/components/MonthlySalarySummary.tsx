import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableHead,
  TableRow,
  Typography,
  TableCell,
  Paper,
  TableContainer,
} from "@mui/material";
import { PaySegment, WorkDayPayMap } from "@/domain";
import { formatValue } from "@/utils";

type SalaryRow = {
  label: string;
  hours: number;
  percent: number;
  total: number;
  rate: number;
};

const buildSalaryRow = (
  map: Record<string, PaySegment>,
  baseRate: number,
): SalaryRow[] => {
  return Object.entries(map)
    .map(([label, segment]) => ({
      label,
      hours: segment.hours,
      percent: segment.percent,
      total: segment.getTotal(baseRate),
      rate: segment.getRate(baseRate),
    }))
    .filter((row) => row.hours > 0);
};

export const MonthlySalarySummary = ({
  globalBreakdown,
}: {
  globalBreakdown: WorkDayPayMap;
}) => {
  const baseRows = useMemo<SalaryRow[]>(() => {
    const baseMap: Record<string, PaySegment> = {
      "100%": globalBreakdown.regular.hours100,
      "שבת תוספת 100%": globalBreakdown.extra100Shabbat,
      מחלה: globalBreakdown.hours100Sick,
      חופש: globalBreakdown.hours100Vacation,
    };

    return buildSalaryRow(baseMap, globalBreakdown.baseRate);
  }, [globalBreakdown]);

  const extraRows = useMemo<SalaryRow[]>(() => {
    const extraMap: Record<string, PaySegment> = {
      "תוספת לילה (50%)": globalBreakdown.extra.hours50,
      "150%": globalBreakdown.regular.hours150,
      "125%": globalBreakdown.regular.hours125,
      "שבת 150%": globalBreakdown.special.shabbat150,
      "שבת 200%": globalBreakdown.special.shabbat200,
      "תוספת ערב (20%)": globalBreakdown.extra.hours20,
    };

    return buildSalaryRow(extraMap, globalBreakdown.baseRate);
  }, [globalBreakdown]);

  const calculateTotal = (rows: SalaryRow[]): number =>
    rows.reduce((sum, row) => sum + row.total, 0);

  const monthlySalary = calculateTotal(baseRows) + calculateTotal(extraRows);

  const renderSection = (
    rows: SalaryRow[],
    summaryLabel: string,
    backgroundColor: string = "#f0f0f0",
  ) => {
    const total = calculateTotal(rows);

    return (
      <>
        {rows.map((row, index) => (
          <TableRow key={index}>
            <TableCell>{row.label}</TableCell>
            <TableCell>{formatValue(row.hours)}</TableCell>
            <TableCell>₪{formatValue(row.rate)}</TableCell>
            <TableCell>₪{formatValue(row.total)}</TableCell>
            <TableCell />
          </TableRow>
        ))}
        <TableRow sx={{ backgroundColor }}>
          <TableCell />
          <TableCell />
          <TableCell />

          <TableCell>{summaryLabel}</TableCell>
          <TableCell>{total > 0 ? `₪${formatValue(total)}` : ""}</TableCell>
        </TableRow>
      </>
    );
  };

  return (
    <>
      <div className="row">
        <Typography variant="h5" gutterBottom sx={{ textAlign: "center" }}>
          סיכום שכר חודשי לפי שעות
        </Typography>
      </div>
      <div className="row">
        <div className="col-12">
          <Paper>
            <TableContainer>
              <Table
                size="small"
                sx={{
                  borderCollapse: "collapse",
                  "& td, & th": {
                    textAlign: "center",
                    border: "1px solid #ddd",
                  },
                  "& th": { fontWeight: "bold" },
                }}
              >
                <TableHead>
                  <TableRow>
                    <TableCell>סוג</TableCell>
                    <TableCell>כמות</TableCell>
                    <TableCell>ערך</TableCell>
                    <TableCell>סכום</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {renderSection(baseRows, "סה״כ 100%")}
                  {renderSection(extraRows, "סה״כ תוספות")}

                  <TableRow
                    sx={{ backgroundColor: "#e0e0e0", fontWeight: "bold" }}
                  >
                    <TableCell />
                    <TableCell />
                    <TableCell />
                    <TableCell>סה״כ לתשלום</TableCell>
                    <TableCell>
                      {monthlySalary > 0
                        ? `₪
                    ${formatValue(monthlySalary)}`
                        : ""}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </div>
      </div>
    </>
  );
};
