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
  Alert,
  Divider,
  Switch,
  FormControlLabel,
  Tooltip,
} from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { useTranslation } from "react-i18next";

import { useGlobalState } from "@/hooks";
import { groupByShabbat } from "@/utils";
import { headersTable } from "@/constants";
import { analyticsService } from "@/services";
import {
  ExpandedDayRow,
  DayRow,
  WorkTableHeader,
  monthToCompactPayBreakdownVM,
} from "@/features/work-table";
import { DomainContextType } from "@/app";
import { monthToPayBreakdownVM } from "@/adapters";
import {
  ShabbatCreditAllocation,
  TableViewMode,
  WorkDayInfo,
} from "@/domain";
import { CompactDayRow } from "./rows/CompactDayRow";

type WorkTableProps = {
  domain: DomainContextType;
  workDays: WorkDayInfo[];
  viewMode: TableViewMode;
  onViewModeChange: (mode: TableViewMode) => void;
  shabbatCreditAllocation: ShabbatCreditAllocation;
};

export const WorkTable = ({
  domain,
  workDays,
  viewMode,
  onViewModeChange,
  shabbatCreditAllocation,
}: WorkTableProps) => {
  const { year, month, baseRate, globalBreakdown } = useGlobalState();
  const { t } = useTranslation("work-table");
  const monthNames = t("months", { returnObjects: true }) as string[];

  // Group workdays by week (ending on Shabbat/Saturday)
  // Note: groupByShabbat is O(n) with n=30, very fast (~0.01ms)
  // useMemo here prevents recreation on every render, but the gain is minimal
  const groupByWeeks = useMemo(() => groupByShabbat(workDays), [workDays]);

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
          <CalendarMonthIcon color="primary" />
          <Typography variant="h6" fontWeight="bold">
            {t("table.month_hours_title", {
              monthName: monthNames[month - 1],
              year,
            })}
          </Typography>
          <Tooltip title={t("table.toggle_view_tooltip")}>
            <FormControlLabel
              control={
                <Switch
                  size="small"
                  checked={viewMode === "expanded"}
                  onChange={(e) => {
                    const mode = e.target.checked ? "expanded" : "compact";
                    onViewModeChange(mode);
                    analyticsService.track({
                      name: "view_mode_toggled",
                      params: { mode },
                    });
                  }}
                  color="primary"
                />
              }
              label={
                <Typography variant="body2">
                  {t("table.toggle_view_label")}
                </Typography>
              }
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
              <WorkTableHeader
                headers={headersTable}
                baseRate={baseRate}
                viewMode={viewMode}
              />

              {groupByWeeks.map((group) => (
                <TableBody key={group[0].meta.date}>
                  {group.map((day, dayIndex) => {
                    const isLastInWeek = dayIndex === group.length - 1;
                    return (
                      <DayRow
                        domain={domain}
                        key={day.meta.date}
                        workDay={day}
                        isLastInWeek={isLastInWeek}
                        viewMode={viewMode}
                        shabbatCreditHours={
                          shabbatCreditAllocation.appliedHoursByDate[
                            day.meta.date
                          ] ?? 0
                        }
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
                        shabbatCreditAllocation.usedHours,
                      )}
                      isFooter
                      emptyStartCells={7}
                    />
                  ) : (
                    <ExpandedDayRow
                      breakdown={monthToPayBreakdownVM(
                        globalBreakdown,
                        shabbatCreditAllocation.usedHours,
                      )}
                      baseRate={baseRate}
                      isFooter
                      emptyStartCells={7}
                    />
                  )}
                </TableRow>
              </TableFooter>
            </Table>
          </TableContainer>
        </Paper>
        {shabbatCreditAllocation.earnedHours > 0 && (
          <Alert
            severity={
              shabbatCreditAllocation.unusedHours > 0 ? "warning" : "info"
            }
            sx={{ mt: 2 }}
          >
            {t("table.shabbat_credit_summary", {
              earned: shabbatCreditAllocation.earnedHours.toFixed(2),
              used: shabbatCreditAllocation.usedHours.toFixed(2),
              unused: shabbatCreditAllocation.unusedHours.toFixed(2),
            })}
            {shabbatCreditAllocation.unusedHours > 0 && (
              <Typography variant="body2">
                {t("table.shabbat_credit_unused_note")}
              </Typography>
            )}
          </Alert>
        )}
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
            {t("table.hint_add_shift")}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontStyle: "italic" }}
          >
            {t("table.hint_cross_midnight")}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontStyle: "italic" }}
          >
            {t("table.hint_duty_shift")}
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontStyle: "italic" }}
          >
            {t("table.hint_save_shift")}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};
