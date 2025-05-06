import { useCallback, useState } from "react";
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
import { emptyBreakdown, subtractBreakdowns, sumBreakdowns } from "@/utility";

import { WorkDayPayMap, WorkDayRowProps } from "@/models";
import { WorkDayRow, FooterSummary, MonthlySalarySummary } from "@/components";

type ConfigValues = {
  year: number;
  month: number;
  baseRate: number;
  standardHours: number;
};

type WorkMonthTableProps = {
  values: ConfigValues;
  eventMap: Record<string, string[]>;
};

export const WorkTable = ({ values, eventMap }: WorkMonthTableProps) => {
  const { workDays } = useWorkDays(values.year, values.month, eventMap);

  const [globalBreakdown, setGlobalBreakdown] =
    useState<WorkDayPayMap>(emptyBreakdown());

  const addToGlobalBreakdown = useCallback((breakdown: WorkDayPayMap) => {
    setGlobalBreakdown((prev) => sumBreakdowns(prev, breakdown));
  }, []);

  const subtractFromGlobalBreakdown = useCallback(
    (breakdown: WorkDayPayMap) => {
      setGlobalBreakdown((prev) => subtractBreakdowns(prev, breakdown));
    },
    [],
  );

  const headers = [
    "יום",
    "מחלה או חופש",
    "שעות",
    "סה״כ",
    "100%",
    "125%",
    "150%",
    "שבת 150%",
    "שבת 200%",
    "שבת תוספת 100%",
    "תוספת ערב",
    "תוספת לילה",
    "מחלה",
    "חופש",
  ];

  const groupByShabbat = (workDays: WorkDayRowProps[]): WorkDayRowProps[][] => {
    const groups: WorkDayRowProps[][] = [];
    let current: WorkDayRowProps[] = [];

    for (const day of workDays) {
      current.push(day);
      const date = new Date(day.date);
      if (date.getDay() === 6) {
        groups.push(current);
        current = [];
      }
    }
    if (current.length) groups.push(current);
    return groups;
  };

  return (
    <>
      <Typography variant="h5" gutterBottom>
        שעות חודש {values.month}/{values.year}
      </Typography>

      <div className="container" dir="rtl">
        <div className="row mb-3">
          <div className="col-12">
            <Paper sx={{ direction: "rtl" }}>
              <TableContainer sx={{ maxHeight: 600 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      {headers.map((label, i) => (
                        <TableCell
                          key={i}
                          align="center"
                          sx={{
                            borderRight: "1px solid #ddd",
                            fontWeight: "bold",
                          }}
                        >
                          {label}
                        </TableCell>
                      ))}
                      {values.baseRate > 0 && (
                        <TableCell
                          align="center"
                          sx={{
                            borderRight: "1px solid #ddd",
                            fontWeight: "bold",
                          }}
                        >
                          שכר יומי
                        </TableCell>
                      )}
                    </TableRow>
                  </TableHead>

                  {groupByShabbat(workDays).map((group, index) => (
                    <TableBody key={index}>
                      {group.map((day) => (
                        <WorkDayRow
                          key={day.date}
                          date={day.date}
                          hebrewDay={day.hebrewDay}
                          typeDay={day.typeDay}
                          crossDayContinuation={day.crossDayContinuation}
                          addToGlobalBreakdown={addToGlobalBreakdown}
                          subtractFromGlobalBreakdown={
                            subtractFromGlobalBreakdown
                          }
                          standardHours={values.standardHours}
                          baseRate={values.baseRate}
                        />
                      ))}
                      <TableRow>
                        <TableCell
                          colSpan={
                            headers.length + (values.baseRate > 0 ? 1 : 0)
                          }
                          sx={{ p: 0 }}
                        >
                          <Box sx={{ height: 4, backgroundColor: "red" }} />
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  ))}
                  <FooterSummary
                    globalBreakdown={globalBreakdown}
                    baseRate={values.baseRate}
                  />
                </Table>
              </TableContainer>
            </Paper>
          </div>
        </div>
        {values.baseRate > 0 && (
          <div className="row">
            <div className="col-12">
              <MonthlySalarySummary
                baseRate={values.baseRate}
                globalBreakdown={globalBreakdown}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
};
