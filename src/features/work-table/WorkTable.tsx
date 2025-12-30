import { useMemo } from "react";
import {
  Table,
  TableRow,
  Typography,
  Paper,
  TableContainer,
  TableBody,
  TableFooter,
} from "@mui/material";

import { useGlobalState } from "@/hooks";
import { groupByShabbat } from "@/utils";
import { headersTable } from "@/constants";
import {
  PayBreakdownRow,
  DayRow,
  WorkTableHeader,
} from "@/features/work-table";
import { DomainContextType } from "@/app";
import { monthToPayBreakdownVM } from "@/adapters";
import { WorkDayInfo } from "@/domain";

type WorkTableProps = {
  domain: DomainContextType;
  workDays: WorkDayInfo[];
};

export const WorkTable = ({ domain, workDays }: WorkTableProps) => {
  const { year, month, baseRate, globalBreakdown } = useGlobalState();
  const { monthResolver } = domain.resolvers;

  const groupByWeeks = useMemo(() => groupByShabbat(workDays), [workDays]);

  return (
    <>
      <div className="container">
        <div className="row mb-3 align-items-center">
          <div className="col">
            <Typography variant="h5" textAlign="center" gutterBottom>
              שעות חודש {monthResolver.getMonthName(month - 1)} - {year}
            </Typography>
          </div>
        </div>
        <div className="row mb-3">
          <div className="col-12">
            <Paper>
              <TableContainer
                sx={{
                  maxHeight: {
                    xs: "70vh", // mobile
                    sm: 600, // desktop
                  },
                  overflowY: "auto",
                  WebkitOverflowScrolling: "touch",
                }}
              >
                <Table
                  stickyHeader
                  size="small"
                  sx={{
                    borderCollapse: "collapse",
                    "& th": {
                      textAlign: "center",
                    },
                  }}
                >
                  <WorkTableHeader headers={headersTable} baseRate={baseRate} />

                  {groupByWeeks.map((group, index) => (
                    <TableBody key={index}>
                      {group.map((day, dayIndex) => {
                        const isLastInWeek = dayIndex === group.length - 1;

                        return (
                          <DayRow
                            domain={domain}
                            key={day.meta.date}
                            workDay={day}
                            isLastInWeek={isLastInWeek}
                          />
                        );
                      })}
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
                        breakdown={monthToPayBreakdownVM(globalBreakdown)}
                        baseRate={baseRate}
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
