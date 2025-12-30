import { useEffect, useMemo, useState } from "react";
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
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DoneIcon from "@mui/icons-material/Done";

import { formatValue } from "@/utils";
import { Segment } from "@/domain";
import { useGlobalState } from "@/hooks";
import { DomainContextType } from "@/app";
import { monthToPayBreakdownVM } from "@/adapters";
import { PayRowVM } from "./salarySummary.vm";
import { PaySection } from "./PaySection";
import {
  buildAllowanceRows,
  buildPayRowsFromSegments,
} from "./salarySummary.mapper";

export const MonthlySalarySummary = ({
  domain,
}: {
  domain: DomainContextType;
}) => {
  const { globalBreakdown, baseRate, year, month } = useGlobalState();
  const [editMode, setEditMode] = useState<boolean>(false);

  const [baseRows, setBaseRows] = useState<PayRowVM[]>([]);
  const [extraRows, setExtraRows] = useState<PayRowVM[]>([]);
  const [allowanceRows, setAllowanceRows] = useState<PayRowVM[]>([]);

  const rateDiem = domain.resolvers.perDiemResolver.resolve({ year, month });

  const allowanceRate = domain.resolvers.mealAllowanceRateResolver.resolve({
    year,
    month,
  });

  const payVM = useMemo(() => {
    return monthToPayBreakdownVM(globalBreakdown);
  }, [globalBreakdown]);

  useEffect(() => {
    const baseMap: Record<string, Segment> = {
      "100%": payVM.regular.hours100,
      "שבת תוספת 100%": payVM.extra100Shabbat,
      מחלה: payVM.hours100Sick,
      חופש: payVM.hours100Vacation,
    };

    const extraMap: Record<string, Segment> = {
      "תוספת לילה (50%)": payVM.extra.hours50,
      "150%": payVM.regular.hours150,
      "125%": payVM.regular.hours125,
      "שבת 150%": payVM.special.shabbat150,
      "שבת 200%": payVM.special.shabbat200,
      "תוספת ערב (20%)": payVM.extra.hours20,
    };

    setBaseRows(buildPayRowsFromSegments(baseRate, baseMap));
    setExtraRows(buildPayRowsFromSegments(baseRate, extraMap));

    setAllowanceRows(
      buildAllowanceRows({
        perDiem: { points: payVM.perDiemPoints, rate: payVM.perDiemAmount },
        mealAllowance: {
          small: { points: payVM.smallPoints, amount: payVM.smallAmount },
          large: { points: payVM.largePoints, amount: payVM.largeAmount },
        },
        rates: allowanceRate,
        rateDiem,
      }),
    );
  }, [payVM, baseRate, rateDiem, allowanceRate]);

  const calculateTotal = (rows: PayRowVM[]): number =>
    rows.reduce((sum, row) => sum + row.total, 0);

  const monthlySalary =
    calculateTotal(baseRows) +
    calculateTotal(extraRows) +
    calculateTotal(allowanceRows);

  const toggleEditMode = () => setEditMode((prev) => !prev);

  return (
    <>
      <div className="container">
        <div className="row d-flex align-items-center mb-2">
          <div className="col text-start">
            <Typography variant="h5" gutterBottom sx={{ textAlign: "center" }}>
              סיכום שכר חודשי - ברוטו - לפי שעות
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
                    <PaySection
                      rows={baseRows}
                      summaryLabel="סה״כ 100%"
                      editMode={editMode}
                      onChange={(index, quantity) =>
                        setBaseRows((prev) =>
                          prev.map((r, i) =>
                            i === index
                              ? { ...r, quantity, total: quantity * r.rate }
                              : r,
                          ),
                        )
                      }
                    />
                    <PaySection
                      rows={extraRows}
                      summaryLabel="סה״כ תוספות"
                      editMode={editMode}
                      onChange={(index, quantity) =>
                        setExtraRows((prev) =>
                          prev.map((r, i) =>
                            i === index
                              ? { ...r, quantity, total: quantity * r.rate }
                              : r,
                          ),
                        )
                      }
                    />

                    <PaySection
                      rows={allowanceRows}
                      summaryLabel="סה״כ"
                      editMode={editMode}
                      onChange={(index, quantity) =>
                        setAllowanceRows((prev) =>
                          prev.map((r, i) =>
                            i === index
                              ? { ...r, quantity, total: quantity * r.rate }
                              : r,
                          ),
                        )
                      }
                    />

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
