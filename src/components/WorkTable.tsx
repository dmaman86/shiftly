import { useCallback } from "react";
import {
  Table,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Box,
  Paper,
  TableContainer,
  TableBody,
} from "@mui/material";

import { useWorkDays } from "@/hooks";
import { DateUtils } from "@/utils";
import { headersTable } from "@/constants";
import { WorkDayInfo, WorkDayPayMap } from "@/domain";
import { WorkDayRow, PayBreakdownRow } from "@/components";

type ConfigValues = {
  year: number;
  month: number;
  baseRate: number;
  standardHours: number;
};

type WorkMonthTableProps = {
  values: ConfigValues;
  eventMap: Record<string, string[]>;
  globalBreakdown: WorkDayPayMap;
  addToGlobalBreakdown: (breakdown: WorkDayPayMap) => void;
  subtractFromGlobalBreakdown: (breakdown: WorkDayPayMap) => void;
};

export const WorkTable = ({
  values,
  eventMap,
  globalBreakdown,
  addToGlobalBreakdown,
  subtractFromGlobalBreakdown,
}: WorkMonthTableProps) => {
  const { workDays } = useWorkDays(values.year, values.month, eventMap);

  const groupByShabbat = (workDays: WorkDayInfo[]): WorkDayInfo[][] => {
    const groups: WorkDayInfo[][] = [];
    let current: WorkDayInfo[] = [];

    for (const day of workDays) {
      current.push(day);
      const date = new Date(day.meta.date);
      if (date.getDay() === 6) {
        groups.push(current);
        current = [];
      }
    }
    if (current.length) groups.push(current);
    return groups;
  };

  const totalColumns = useCallback(() => {
    return (
      headersTable.reduce((sum, header) => {
        if ("children" in header && Array.isArray(header.children))
          return sum + header.children.length;
        return sum + 1;
      }, 0) + (values.baseRate > 0 ? 1 : 0)
    );
  }, [values.baseRate]);

  return (
    <>
      <div className="container">
        <div className="row mb-3">
          <Typography variant="h5" textAlign="center" gutterBottom>
            שעות חודש {DateUtils.getMonth(values.month)} - {values.year}
          </Typography>
        </div>
        <div className="row mb-3">
          <div className="col-12">
            <Paper>
              <TableContainer sx={{ maxHeight: 600 }}>
                <Table
                  stickyHeader
                  size="small"
                  sx={{
                    borderCollapse: "collapse",
                    "& td, & th": {
                      border: "1px solid #ddd",
                      textAlign: "center",
                    },
                  }}
                >
                  <TableHead>
                    <TableRow>
                      {headersTable.map((header, i) => (
                        <TableCell
                          key={`group-${i}`}
                          align="center"
                          colSpan={
                            "children" in header ? header.children!.length : 1
                          }
                          rowSpan={
                            "children" in header ? 1 : (header.rowSpan ?? 2)
                          }
                          sx={{
                            fontWeight: "bold",
                            minWidth: `${"children" in header ? header.children!.length : 1 * 90}px`,
                          }}
                        >
                          <div className="row">
                            <div className="col-12 fw-bold">{header.label}</div>
                          </div>
                          {"children" in header && (
                            <div className="row text-center">
                              {header.children!.map((child, j) => (
                                <div className="col" key={`child-${i}-${j}`}>
                                  {child}
                                </div>
                              ))}
                            </div>
                          )}
                        </TableCell>
                      ))}

                      {globalBreakdown.baseRate > 0 && (
                        <TableCell
                          sx={{
                            fontWeight: "bold",
                            minWidth: "90px",
                          }}
                        >
                          שכר יומי
                        </TableCell>
                      )}
                    </TableRow>
                    <TableRow style={{ display: "none" }}>
                      {headersTable.flatMap((header, i) =>
                        "children" in header
                          ? header.children!.map((_, j) => (
                              <TableCell key={`invisible-${i}-${j}`} />
                            ))
                          : [
                              <TableCell
                                key={`col-flat-${i}-${header.label}`}
                              />,
                            ],
                      )}
                      {globalBreakdown.baseRate > 0 && <TableCell />}
                    </TableRow>
                  </TableHead>

                  {groupByShabbat(workDays).map((group, index) => (
                    <TableBody key={index}>
                      {group.map((day) => (
                        <WorkDayRow
                          key={day.meta.date}
                          meta={day.meta}
                          hebrewDay={day.hebrewDay}
                          addToGlobalBreakdown={addToGlobalBreakdown}
                          subtractFromGlobalBreakdown={
                            subtractFromGlobalBreakdown
                          }
                          standardHours={values.standardHours}
                          baseRate={values.baseRate}
                        />
                      ))}
                      <TableRow>
                        <TableCell colSpan={totalColumns()} sx={{ p: 0 }}>
                          <Box sx={{ height: 2, backgroundColor: "red" }} />
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  ))}
                  <PayBreakdownRow
                    breakdown={globalBreakdown}
                    baseRate={globalBreakdown.baseRate}
                    isFooter
                    emptyStartCells={4}
                  />
                </Table>
              </TableContainer>
            </Paper>
          </div>
        </div>
      </div>
    </>
  );
};
