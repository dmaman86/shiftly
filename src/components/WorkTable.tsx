import { useMemo } from "react";
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
  TableFooter,
} from "@mui/material";

import { useGlobalState, useWorkDays } from "@/hooks";
import { DateUtils, getTotalColumns, groupByShabbat } from "@/utils";
import { headersTable } from "@/constants";
import { PayBreakdownRow, DayRow } from "@/components";
import { DomainContextType } from "@/context";

export const WorkTable = ({ domain }: { domain: DomainContextType }) => {
  const { year, month, baseRate, globalBreakdown } = useGlobalState();
  const { workDays } = useWorkDays();
  const { getMonth } = DateUtils();

  const groupByWeeks = useMemo(
    () => groupByShabbat(workDays),
    [workDays],
  );

  const totalColumns = useMemo(
    () => getTotalColumns(headersTable, baseRate),
    [baseRate],
  );

  return (
    <>
      <div className="container">
        <div className="row mb-3">
          <Typography variant="h5" textAlign="center" gutterBottom>
            שעות חודש {getMonth(month)} - {year}
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

                      {baseRate > 0 && (
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
                      {baseRate > 0 && <TableCell />}
                    </TableRow>
                  </TableHead>

                  {groupByWeeks.map((group, index) => (
                    <TableBody key={index}>
                      {group.map((day) => (
                        <DayRow
                          domain={domain}
                          key={day.meta.date}
                          meta={day.meta}
                        />
                      ))}
                      <TableRow>
                        <TableCell colSpan={totalColumns} sx={{ p: 0 }}>
                          <Box sx={{ height: 2, backgroundColor: "red" }} />
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  ))}
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
                      <PayBreakdownRow
                        breakdown={globalBreakdown}
                        isFooter
                        emptyStartCells={4}
                      />
                    </TableRow>
                  </TableFooter>
                </Table>
              </TableContainer>
            </Paper>
          </div>
        </div>
      </div>
    </>
  );
};
