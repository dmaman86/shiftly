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
  Switch,
  FormControlLabel,
  Tooltip,
} from "@mui/material";
import { CalendarMonth } from "@mui/icons-material";

import { useGlobalState } from "@/hooks";
import { groupByShabbat } from "@/utils";
import { headersTable, headersTableCompact } from "@/constants";
import {
  ExpandedDayRow,
  DayRow,
  WorkTableHeader,
  monthToCompactPayBreakdownVM,
} from "@/features/work-table";
import { DomainContextType } from "@/app";
import { monthToPayBreakdownVM } from "@/adapters";
import { TableViewMode, WorkDayInfo } from "@/domain";
import { CompactDayRow } from "./rows/CompactDayRow";

type WorkTableProps = {
  domain: DomainContextType;
  workDays: WorkDayInfo[];
  viewMode: TableViewMode;
  onViewModeChange: (mode: TableViewMode) => void;
};

export const WorkTable = ({
  domain,
  workDays,
  viewMode,
  onViewModeChange,
}: WorkTableProps) => {
  const { year, month, baseRate, globalBreakdown } = useGlobalState();
  const { monthResolver } = domain.resolvers;

  // Group workdays by week (ending on Shabbat/Saturday)
  // Note: groupByShabbat is O(n) with n=30, very fast (~0.01ms)
  // useMemo here prevents recreation on every render, but the gain is minimal
  const groupByWeeks = useMemo(() => groupByShabbat(workDays), [workDays]);

  const headers = viewMode === "compact" ? headersTableCompact : headersTable;

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <CalendarMonth color="primary" />
          <Typography variant="h6" fontWeight="bold">
            שעות חודש {monthResolver.getMonthName(month - 1)} {year}
          </Typography>
          <Tooltip title="החלף בין תצוגה מצומצמת למלאה">
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={viewMode === "expanded"}
                  onChange={(e) =>
                    onViewModeChange(e.target.checked ? "expanded" : "compact")
                  }
                  color="primary"
                />
              }
              label={<Typography variant="body2">תצוגה מלאה</Typography>}
              labelPlacement="start"
            />
          </Tooltip>
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
              <WorkTableHeader headers={headers} baseRate={baseRate} />

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
                        viewMode={viewMode}
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
                  {viewMode === "compact" ? (
                    <CompactDayRow
                      breakdown={monthToCompactPayBreakdownVM(
                        globalBreakdown,
                        baseRate,
                      )}
                      isFooter
                      emptyStartCells={4}
                    />
                  ) : (
                    <ExpandedDayRow
                      breakdown={monthToPayBreakdownVM(globalBreakdown)}
                      baseRate={baseRate}
                      isFooter
                      emptyStartCells={4}
                    />
                  )}
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
