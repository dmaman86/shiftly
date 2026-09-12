import { useEffect, useMemo } from "react";
import { useAuth } from "@/hooks/useAuth";
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
  TableCell,
  Stack,
} from "@mui/material";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import { useTranslation } from "react-i18next";

import { useDeviceType, useGlobalBreakdown, useGlobalState } from "@/hooks";
import { groupByShabbat } from "@/utils";
import { headersTable } from "@/constants";
import {
  CompactDayRow,
  MobileWorkTable,
  DayRow,
  MonthSummaryCard,
  WorkTableHeader,
  WorkTableDayStateProvider,
  WorkTableDayStateHydrator,
  monthToCompactPayBreakdownVM,
  monthToPayBreakdownVM,
} from "@/features/work-table";
import { DomainContextType } from "@/app";
import { ShabbatCreditAllocation, WorkDayInfo } from "@/domain";
import { FeatureBoundary } from "@/layout";

type WorkTableProps = {
  domain: DomainContextType;
  workDays: WorkDayInfo[];
  shabbatCreditAllocation: ShabbatCreditAllocation;
};

export const WorkTable = ({
  domain,
  workDays,
  shabbatCreditAllocation,
}: WorkTableProps) => {
  const { year, month, baseRate, reset } = useGlobalState();
  const { user } = useAuth();
  const userId = user?.id;
  useEffect(() => reset(), [userId, reset]);
  const globalBreakdown = useGlobalBreakdown(
    domain.payMap.monthPayMapCalculator,
  );
  const { isMobile } = useDeviceType();
  const { t } = useTranslation("work-table");
  const monthNames = t("months", { returnObjects: true }) as string[];
  const currentDate = domain.services.dateService.formatDate(new Date());

  // Group workdays by week (ending on Shabbat/Saturday)
  // Note: groupByShabbat is O(n) with n=30, very fast (~0.01ms)
  // useMemo here prevents recreation on every render, but the gain is minimal
  const groupByWeeks = useMemo(() => groupByShabbat(workDays), [workDays]);

  const monthBreakdown = monthToCompactPayBreakdownVM(
    globalBreakdown,
    baseRate,
    shabbatCreditAllocation.usedHours,
  );
  const monthFullBreakdown = monthToPayBreakdownVM(
    globalBreakdown,
    shabbatCreditAllocation.usedHours,
  );

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
        </Box>
        <Divider sx={{ mb: 2 }} />

        <WorkTableDayStateProvider ownerKey={JSON.stringify([userId, year, month])}>
          <WorkTableDayStateHydrator domain={domain} workDays={workDays}>
          {isMobile ? (
            <Stack spacing={1.5}>
              <FeatureBoundary
                featureName={t("feature_name_work_table")}
                errorContext="MobileWorkTable"
                resetKeys={[year, month]}
              >
                <MobileWorkTable
                  domain={domain}
                  workDays={workDays}
                  currentDate={currentDate}
                  shabbatCreditHoursByDate={
                    shabbatCreditAllocation.appliedHoursByDate
                  }
                />
              </FeatureBoundary>
              <MonthSummaryCard
                breakdown={monthBreakdown}
                fullBreakdown={monthFullBreakdown}
              />
            </Stack>
          ) : (
            <Paper
              variant="outlined"
              sx={{ borderRadius: 2, overflow: "hidden" }}
            >
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
                    viewMode="compact"
                  />

                  {groupByWeeks.map((group) => (
                    <TableBody key={group[0].meta.date}>
                      {group.map((day, dayIndex) => {
                        const isLastInWeek = dayIndex === group.length - 1;
                        return (
                          <FeatureBoundary
                            key={day.meta.date}
                            featureName={t("feature_name_work_table")}
                            errorContext="DayRow"
                            resetKeys={[day.meta.date]}
                          >
                            <DayRow
                              domain={domain}
                              workDay={day}
                              isLastInWeek={isLastInWeek}
                              shabbatCreditHours={
                                shabbatCreditAllocation.appliedHoursByDate[
                                  day.meta.date
                                ] ?? 0
                              }
                            />
                          </FeatureBoundary>
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
                      <CompactDayRow
                        breakdown={monthBreakdown}
                        isFooter
                        emptyStartCells={7}
                      />
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                </Table>
              </TableContainer>
            </Paper>
          )}
          </WorkTableDayStateHydrator>
        </WorkTableDayStateProvider>
        {shabbatCreditAllocation.totalAvailableHours > 0 && (
          <Alert
            severity={
              shabbatCreditAllocation.unusedHours > 0 ? "warning" : "info"
            }
            sx={{ mt: 2 }}
          >
            {shabbatCreditAllocation.carriedOverHours > 0 && (
              <Typography variant="body2">
                {t("table.shabbat_credit_carried_over", {
                  hours: shabbatCreditAllocation.carriedOverHours.toFixed(2),
                })}
              </Typography>
            )}
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
            {t("table.hint_auto_update")}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};
