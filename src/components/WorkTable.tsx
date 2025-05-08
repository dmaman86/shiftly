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
import { BreakdownUtils, DateUtils } from "@/utility";

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
  const { getMonth } = DateUtils;

  const { sumBreakdowns, subtractBreakdowns, initBreakdown } = BreakdownUtils;

  const [globalBreakdown, setGlobalBreakdown] =
    useState<WorkDayPayMap>(initBreakdown);

  const addToGlobalBreakdown = useCallback(
    (breakdown: WorkDayPayMap) => {
      setGlobalBreakdown((prev) => sumBreakdowns(prev, breakdown));
    },
    [sumBreakdowns],
  );

  const subtractFromGlobalBreakdown = useCallback(
    (breakdown: WorkDayPayMap) => {
      setGlobalBreakdown((prev) => subtractBreakdowns(prev, breakdown));
    },
    [subtractBreakdowns],
  );

  const headers = [
    { label: "יום", rowSpan: 2 },
    { label: "", children: ["מחלה", "חופש"] },
    { label: "שעות", rowSpan: 2 },
    { label: "סה״כ", rowSpan: 2 },
    {
      label: "ש״נ",
      children: ["100%", "125%", "150%"],
    },
    {
      label: "שבת",
      children: ["150%", "200%"],
    },
    {
      label: "תוספות",
      children: ["ז. שבת ", "20%", "50%"],
    },
    {
      label: "היעדרות",
      children: ["מחלה", "חופש"],
    },
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

  const totalColumns =
    headers.reduce((sum, header) => {
      if ("children" in header && Array.isArray(header.children))
        return sum + header.children.length;
      return sum + 1;
    }, 0) + (values.baseRate > 0 ? 1 : 0);

  return (
    <>
      <Typography variant="h5" gutterBottom>
        שעות חודש {getMonth(values.month)} - {values.year}
      </Typography>

      <div className="container" dir="rtl">
        <div className="row mb-3">
          <div className="col-12">
            <Paper sx={{ direction: "rtl" }}>
              <TableContainer sx={{ maxHeight: 600 }}>
                <Table stickyHeader size="small">
                  <TableHead>
                    <TableRow>
                      {headers.map((header, i) =>
                        "children" in header ? (
                          <TableCell
                            key={`group-${i}`}
                            align="center"
                            colSpan={header.children!.length}
                            sx={{
                              borderRight: "1px solid #ddd",
                              fontWeight: "bold",
                              minWidth: `${header.children!.length * 90}px`,
                            }}
                          >
                            <div className="row">
                              <div className="col-12 fw-bold">
                                {header.label}
                              </div>
                            </div>
                            <div className="row text-center">
                              {header.children!.map((child, j) => (
                                <div className="col" key={`child-${i}-${j}`}>
                                  {child}
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        ) : (
                          <TableCell
                            key={i}
                            align="center"
                            sx={{
                              fontWeight: "bold",
                              borderRight: "1px solid #ddd",
                            }}
                          >
                            {header.label}
                          </TableCell>
                        ),
                      )}
                      {values.baseRate > 0 && (
                        <TableCell
                          align="center"
                          sx={{
                            borderRight: "1px solid #ddd",
                            fontWeight: "bold",
                            minWidth: "90px",
                          }}
                        >
                          שכר יומי
                        </TableCell>
                      )}
                    </TableRow>
                    <TableRow style={{ display: "none" }}>
                      {headers.flatMap((header, i) =>
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
                      {values.baseRate > 0 && <TableCell />}
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
                        <TableCell colSpan={totalColumns} sx={{ p: 0 }}>
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
