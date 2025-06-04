import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableHead,
  TableRow,
  Typography,
  TableCell,
  Paper,
  TableContainer,
  Tooltip,
  IconButton,
  TextField,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DoneIcon from "@mui/icons-material/Done";

import { PaySegment, WorkDayPayMap } from "@/domain";
import { formatValue } from "@/utils";

type SalaryRow = {
  label: string;
  hours: number;
  percent: number;
  total: number;
  rate: number;
};

const buildSalaryRow = (map: Record<string, PaySegment>): SalaryRow[] => {
  return Object.entries(map).map(([label, segment]) => ({
    label,
    hours: Number(segment.hours.toFixed(2)),
    percent: segment.percent,
    total: segment.total,
    rate: segment.rate,
  }));
  // .filter((row) => row.hours > 0);
};

export const MonthlySalarySummary = ({
  globalBreakdown,
}: {
  globalBreakdown: WorkDayPayMap;
}) => {
  const [editMode, setEditMode] = useState<boolean>(false);

  const [baseRows, setBaseRows] = useState<SalaryRow[]>([]);
  const [extraRows, setExtraRows] = useState<SalaryRow[]>([]);

  useEffect(() => {
    const baseMap: Record<string, PaySegment> = {
      "100%": globalBreakdown.regular.hours100,
      "שבת תוספת 100%": globalBreakdown.extra100Shabbat,
      מחלה: globalBreakdown.hours100Sick,
      חופש: globalBreakdown.hours100Vacation,
    };

    const extraMap: Record<string, PaySegment> = {
      "תוספת לילה (50%)": globalBreakdown.extra.hours50,
      "150%": globalBreakdown.regular.hours150,
      "125%": globalBreakdown.regular.hours125,
      "שבת 150%": globalBreakdown.special.shabbat150,
      "שבת 200%": globalBreakdown.special.shabbat200,
      "תוספת ערב (20%)": globalBreakdown.extra.hours20,
    };

    setBaseRows(buildSalaryRow(baseMap));
    setExtraRows(buildSalaryRow(extraMap));
  }, [globalBreakdown]);

  const calculateTotal = (rows: SalaryRow[]): number =>
    rows.reduce((sum, row) => sum + row.total, 0);

  const monthlySalary = calculateTotal(baseRows) + calculateTotal(extraRows);

  const toggleEditMode = () => setEditMode((prev) => !prev);

  const renderSection = (
    rows: SalaryRow[],
    summaryLabel: string,
    setter: React.Dispatch<React.SetStateAction<SalaryRow[]>>,
    backgroundColor: string = "#f0f0f0",
  ) => {
    const total = calculateTotal(rows);

    return (
      <>
        {rows.map((row, index) => (
          <TableRow key={index}>
            <TableCell>{row.label}</TableCell>
            <TableCell>
              {editMode ? (
                <TextField
                  type="number"
                  size="small"
                  value={row.hours}
                  variant="standard"
                  slotProps={{
                    inputLabel: {
                      shrink: true,
                    },
                  }}
                  onChange={(e) => {
                    const newHours = Number(e.target.value);
                    if (!isNaN(newHours)) {
                      const updateRow = {
                        ...row,
                        hours: newHours,
                        total: newHours * row.rate,
                      };
                      setter((prev) =>
                        prev.map((r, i) => (i === index ? updateRow : r)),
                      );
                    }
                  }}
                />
              ) : (
                formatValue(row.hours)
              )}
            </TableCell>
            <TableCell>₪{formatValue(row.rate)}</TableCell>
            <TableCell>
              {row.total > 0 ? `₪${formatValue(row.total)}` : ""}
            </TableCell>
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
      <div className="container">
        <div className="row d-flex align-items-center mb-2">
          <div className="col text-start">
            <Typography variant="h5" gutterBottom sx={{ textAlign: "center" }}>
              סיכום שכר חודשי לפי שעות
            </Typography>
          </div>
          <div className="col-auto">
            <Tooltip title={editMode ? "סיים עריכה" : "ערוך שעות"}>
              <IconButton onClick={toggleEditMode} size="small">
                {editMode ? <DoneIcon /> : <EditIcon />}
              </IconButton>
            </Tooltip>
          </div>
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
                    {renderSection(baseRows, "סה״כ 100%", setBaseRows)}
                    {renderSection(extraRows, "סה״כ תוספות", setExtraRows)}

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
      </div>
    </>
  );
};
