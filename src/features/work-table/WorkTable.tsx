import { useMemo } from "react";
import {
  Table,
  TableBody,
  TableContainer,
  TableFooter,
  TableRow,
  Paper,
  Typography,
  Box,
  Card,
  CardContent,
  Divider,
} from "@mui/material";
import { CalendarMonth } from "@mui/icons-material";

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
    <Card sx={{ mb: 3 }}>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <CalendarMonth color="primary" />
          <Typography variant="h6" fontWeight="bold">
            שעות חודש {monthResolver.getMonthName(month - 1)} {year}
          </Typography>
        </Box>
        <Divider sx={{ mb: 2 }} />
        {/* Table */}
        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
          <TableContainer
            sx={{
              maxHeight: {
                xs: "70vh",
                sm: 600,
              },
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            <Table
              stickyHeader
              size="small"
              sx={{
                "& th": {
                  textAlign: "center",
                  fontWeight: "bold",
                  backgroundColor: (theme) => theme.palette.grey[100],
                  borderBottom: "2px solid",
                  borderColor: "divider",
                },
                "& td": {
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
                    "& td": {
                      fontWeight: "bold",
                      borderTop: "3px solid",
                    },
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
        <Box
          sx={{
            mt: 2,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: 2,
          }}
        >
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontStyle: "italic" }}
          >
            • לחץ על ➕ להוספת משמרת
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontStyle: "italic" }}
          >
            • סמן ✅ למשמרת שחוצה את חצות
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontStyle: "italic" }}
          >
            • לחץ על 🚗 לסימון משמרת בתפקיד (זכאות אש״ל)
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontStyle: "italic" }}
          >
            • לחץ על 💾 לשמירת שינויים ועדכון שכר
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};
