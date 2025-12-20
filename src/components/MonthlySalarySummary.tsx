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

import { formatValue } from "@/utils";
import { Segment } from "@/domain";
import { useGlobalState } from "@/hooks";
import { DomainContextType } from "@/context";

type SalaryRow = {
  label: string;
  hours: number;
  percent: number;
  total: number;
  rate: number;
};

type PerDiemRow = {
  label: string;
  points: number;
  rate: number;
  total: number;
};

const buildSalaryRow = (
  baseRate: number,
  map: Record<string, Segment>,
): SalaryRow[] => {
  return Object.entries(map).map(([label, segment]) => {
    const rate = baseRate * segment.percent;
    const total = segment.hours * rate;

    return {
      label,
      hours: Number(segment.hours.toFixed(2)),
      percent: segment.percent,
      rate,
      total,
    };
  });
};

export const MonthlySalarySummary = ({
  domain,
}: {
  domain: DomainContextType;
}) => {
  const { globalBreakdown, baseRate, year, month } = useGlobalState();
  const [editMode, setEditMode] = useState<boolean>(false);

  const [baseRows, setBaseRows] = useState<SalaryRow[]>([]);
  const [extraRows, setExtraRows] = useState<SalaryRow[]>([]);
  const [perDiemRow, setPerDiemRow] = useState<PerDiemRow | null>(null);

  const rateDiem = domain.resolvers.perDiemResolver.getRateForRate(year, month);

  useEffect(() => {
    const baseMap: Record<string, Segment> = {
      "100%": globalBreakdown.regular.hours100,
      "שבת תוספת 100%": globalBreakdown.extra100Shabbat,
      מחלה: globalBreakdown.hours100Sick,
      חופש: globalBreakdown.hours100Vacation,
    };

    const extraMap: Record<string, Segment> = {
      "תוספת לילה (50%)": globalBreakdown.extra.hours50,
      "150%": globalBreakdown.regular.hours150,
      "125%": globalBreakdown.regular.hours125,
      "שבת 150%": globalBreakdown.special.shabbat150,
      "שבת 200%": globalBreakdown.special.shabbat200,
      "תוספת ערב (20%)": globalBreakdown.extra.hours20,
    };

    setPerDiemRow({
      label: "אש״ל",
      points: globalBreakdown.perDiem.points || 0,
      rate: rateDiem,
      total: globalBreakdown.perDiem.amount || 0,
    });

    setBaseRows(buildSalaryRow(baseRate, baseMap));
    setExtraRows(buildSalaryRow(baseRate, extraMap));
  }, [globalBreakdown, baseRate, rateDiem]);

  const calculateTotal = (rows: SalaryRow[]): number =>
    rows.reduce((sum, row) => sum + row.total, 0);

  const monthlySalary =
    calculateTotal(baseRows) +
    calculateTotal(extraRows) +
    (perDiemRow?.total || 0);

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
                    if (isNaN(newHours) || newHours < 0) return;
                    const newTotal = newHours * row.rate;
                    setter((prev) =>
                      prev.map((r, i) =>
                        i === index
                          ? { ...r, hours: newHours, total: newTotal }
                          : r,
                      ),
                    );
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

                    <TableRow>
                      <TableCell>{perDiemRow?.label}</TableCell>
                      <TableCell>
                        {editMode ? (
                          <TextField
                            type="number"
                            size="small"
                            value={perDiemRow?.points || 0}
                            variant="standard"
                            onChange={(e) => {
                              const newPoints = Number(e.target.value);
                              if (isNaN(newPoints) || newPoints < 0) return;
                              setPerDiemRow((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      points: newPoints,
                                      total: newPoints * prev.rate,
                                    }
                                  : prev,
                              );
                            }}
                          />
                        ) : (
                          formatValue(perDiemRow?.points || 0)
                        )}
                      </TableCell>
                      <TableCell>
                        ₪{formatValue(perDiemRow?.rate || 0)}
                      </TableCell>
                      <TableCell>
                        {perDiemRow && perDiemRow.total > 0
                          ? `₪${formatValue(perDiemRow.total)}`
                          : ""}
                      </TableCell>
                    </TableRow>
                    <TableRow sx={{ backgroundColor: "#f0f0f0" }}>
                      <TableCell />
                      <TableCell />
                      <TableCell />
                      <TableCell>סה״כ אש״ל</TableCell>
                      <TableCell>
                        {perDiemRow && perDiemRow.total > 0
                          ? `₪${formatValue(perDiemRow.total)}`
                          : ""}
                      </TableCell>
                    </TableRow>

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
