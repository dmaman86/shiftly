import { forwardRef, useMemo } from "react";
import {
  GlobalStyles,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableFooter,
  TableRow,
  Typography,
} from "@mui/material";
import { useTranslation } from "react-i18next";

import { dayToPayBreakdownVM } from "@/adapters";
import { WorkDayStatus, WorkDayType } from "@/constants";
import { DomainContextType } from "@/app";
import {
  calculateDayFromShifts,
  PayBreakdownViewModel,
  WorkDayInfo,
} from "@/domain";
import { useGlobalState } from "@/hooks";
import { formatValue, groupByShabbat } from "@/utils";
import { dayToCompactPayBreakdownVM } from "../../mappers/day/dayToCompactPayBreakdownVM";
import { useWorkTableDayState } from "../../hooks/day/useWorkTableDayState";

type WorkTablePrintViewProps = {
  domain: DomainContextType;
  workDays: WorkDayInfo[];
  monthName: string;
  shabbatCreditHoursByDate: Readonly<Record<string, number>>;
  monthBreakdown: PayBreakdownViewModel;
  dailySalary?: number;
  pdfMetadataHeader?: string;
};

type PrintDayRowProps = {
  domain: DomainContextType;
  workDay: WorkDayInfo;
  month: number;
  year: number;
  baseRate: number;
  standardHours: number;
  shabbatCreditHours: number;
  isLastInWeek: boolean;
};

const PrintDayRow = ({
  domain,
  workDay,
  month,
  year,
  baseRate,
  standardHours,
  shabbatCreditHours,
  isLastInWeek,
}: PrintDayRowProps) => {
  const { t } = useTranslation("work-table");
  const { status, shiftEntries } = useWorkTableDayState(workDay.meta.date);
  const { dateService } = domain.services;
  const { dayInfoResolver } = domain.resolvers;

  const calculation = useMemo(() => {
    const validShifts = Object.values(shiftEntries)
      .filter((entry) => entry.payMap !== null)
      .map((entry) => entry.shift);
    const { dayPayMap } = calculateDayFromShifts({
      dayPayMapBuilder: domain.payMap.dayPayMapBuilder,
      meta: workDay.meta,
      month,
      shifts: validShifts,
      shiftMapBuilder: domain.payMap.shiftMapBuilder,
      standardHours,
      status,
      year,
    });

    return {
      breakdown: dayToPayBreakdownVM(dayPayMap, shabbatCreditHours),
      compact: dayToCompactPayBreakdownVM(
        dayPayMap,
        baseRate,
        shabbatCreditHours,
      ),
    };
  }, [
    baseRate,
    domain,
    month,
    shabbatCreditHours,
    shiftEntries,
    standardHours,
    status,
    workDay.meta,
    year,
  ]);

  const days = t("days", { returnObjects: true }) as string[];
  const weekdayLabel = days[dateService.getWeekday(workDay.meta.date)];
  const dayLabel = dayInfoResolver.formatWorkDayLabel(workDay, weekdayLabel);
  const shifts = Object.values(shiftEntries).map(({ shift }) => shift);
  const formatShiftTimes = (field: "start" | "end") =>
    shifts
      .map(({ [field]: timeField }) =>
        dateService.minutesToTimeStr(
          dateService.getMinutesFromMidnight(timeField.date),
        ),
      )
      .join("\n");
  const specialFullDay = workDay.meta.typeDay === WorkDayType.SpecialFull;

  return (
    <TableRow
      data-week-end={isLastInWeek ? "true" : undefined}
      sx={{
        "& > td": {
          borderBottom: isLastInWeek ? "3px solid #1d3e91" : undefined,
        },
      }}
    >
      <TableCell>{dayLabel}</TableCell>
      <TableCell sx={{ whiteSpace: "pre-line" }}>{formatShiftTimes("start")}</TableCell>
      <TableCell sx={{ whiteSpace: "pre-line" }}>{formatShiftTimes("end")}</TableCell>
      <TableCell>
        {status === WorkDayStatus.sick
          ? t("headers.sick")
          : status === WorkDayStatus.vacation
            ? t("headers.vacation")
            : ""}
      </TableCell>
      <TableCell>{formatValue(calculation.compact.actualHours)}</TableCell>
      <TableCell>{formatValue(calculation.compact.totalHours)}</TableCell>
      <TableCell>{formatValue(calculation.breakdown.regular.hours100.hours)}</TableCell>
      <TableCell>{formatValue(calculation.breakdown.regular.hours125.hours)}</TableCell>
      <TableCell>{formatValue(calculation.breakdown.regular.hours150.hours)}</TableCell>
      <TableCell>{formatValue(calculation.breakdown.extra.hours20.hours)}</TableCell>
      <TableCell>{formatValue(calculation.breakdown.extra.hours50.hours)}</TableCell>
      <TableCell>{formatValue(calculation.breakdown.special.shabbat150.hours)}</TableCell>
      <TableCell>{formatValue(calculation.breakdown.special.shabbat200.hours)}</TableCell>
      <TableCell>{specialFullDay ? "" : formatValue(calculation.breakdown.hours100Sick.hours)}</TableCell>
      <TableCell>{specialFullDay ? "" : formatValue(calculation.breakdown.hours100Vacation.hours)}</TableCell>
      <TableCell>{formatValue(calculation.breakdown.appliedShabbatCredit.hours)}</TableCell>
      <TableCell>{formatValue(calculation.breakdown.perDiemPoints)}</TableCell>
      <TableCell>{formatValue(calculation.breakdown.largePoints)}</TableCell>
      <TableCell>{formatValue(calculation.breakdown.smallPoints)}</TableCell>
      <TableCell>
        {calculation.compact.dailySalary
          ? `₪${formatValue(calculation.compact.dailySalary)}`
          : ""}
      </TableCell>
    </TableRow>
  );
};

export const WorkTablePrintView = forwardRef<HTMLDivElement, WorkTablePrintViewProps>(
  function WorkTablePrintView(
    {
      domain,
      workDays,
      monthName,
      shabbatCreditHoursByDate,
      monthBreakdown,
      dailySalary,
      pdfMetadataHeader,
    },
    ref,
  ) {
  const { t } = useTranslation("work-table");
  const { month, year, baseRate, standardHours } = useGlobalState();
  const groupedWorkDays = useMemo(() => groupByShabbat(workDays), [workDays]);

  return (
    <>
      <GlobalStyles
        styles={{
          "@media print": {
            "@page": { size: "landscape", margin: "8mm" },
            body: { backgroundColor: "#fff" },
            "body *": { visibility: "hidden" },
            ".work-table-print-view, .work-table-print-view *": {
              visibility: "visible",
            },
            ".work-table-print-view": {
              display: "block !important",
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
            },
          },
        }}
      />
      <div
        ref={ref}
        className="work-table-print-view"
        dir="rtl"
        aria-hidden="true"
        style={{
          position: "fixed",
          top: 0,
          left: "-10000px",
          display: "block",
          width: 1400,
          backgroundColor: "#fff",
          padding: 8,
        }}
      >
        <Typography component="h1" sx={{ mb: 1, fontSize: 14, fontWeight: 700 }}>
          {t("table.month_hours_title", { monthName, year })}
        </Typography>
        {pdfMetadataHeader && (
          <Typography
            component="div"
            sx={{ mb: 1, color: "#4a4a4a", fontSize: 8, fontWeight: 500 }}
          >
            {pdfMetadataHeader}
          </Typography>
        )}
        <TableContainer>
          <Table
            size="small"
            sx={{
              tableLayout: "fixed",
              borderCollapse: "collapse",
              color: "#1d3e91",
              "& th, & td": {
                border: "1px solid #777",
                p: "2px 3px",
                textAlign: "center",
                verticalAlign: "middle",
                fontSize: "7px",
                lineHeight: 1.2,
              },
              "& th": { fontWeight: 700, bgcolor: "#f3f3f3" },
            }}
          >
            <TableHead>
              <TableRow>
                <TableCell rowSpan={2}>{t("headers.day")}</TableCell>
                <TableCell colSpan={2}>{t("headers.hours")}</TableCell>
                <TableCell rowSpan={2}>{t("headers.description")}</TableCell>
                <TableCell colSpan={2}>{t("headers.total_hours")}</TableCell>
                <TableCell colSpan={3}>{t("headers.regular")}</TableCell>
                <TableCell colSpan={2}>{t("headers.extras")}</TableCell>
                <TableCell colSpan={2}>{t("headers.shabbat")}</TableCell>
                <TableCell colSpan={2}>{t("headers.absence")}</TableCell>
                <TableCell rowSpan={2}>{t("headers.shabbat_credit")}</TableCell>
                <TableCell rowSpan={2}>{t("headers.meal_allowance")}</TableCell>
                <TableCell rowSpan={2}>{t("headers.meal_large")}</TableCell>
                <TableCell rowSpan={2}>{t("headers.meal_small")}</TableCell>
                <TableCell rowSpan={2}>{t("daily_salary_header")}</TableCell>
              </TableRow>
              <TableRow>
                <TableCell>{t("headers.entry")}</TableCell>
                <TableCell>{t("headers.exit")}</TableCell>
                <TableCell>{t("headers.actual_hours")}</TableCell>
                <TableCell>{t("headers.total_hours")}</TableCell>
                <TableCell>100%</TableCell>
                <TableCell>125%</TableCell>
                <TableCell>150%</TableCell>
                <TableCell>20%</TableCell>
                <TableCell>50%</TableCell>
                <TableCell>150%</TableCell>
                <TableCell>200%</TableCell>
                <TableCell>{t("headers.sick")}</TableCell>
                <TableCell>{t("headers.vacation")}</TableCell>
              </TableRow>
            </TableHead>
            {groupedWorkDays.map((group) => (
              <TableBody key={group[0].meta.date}>
                {group.map((workDay, dayIndex) => (
                  <PrintDayRow
                    key={workDay.meta.date}
                    domain={domain}
                    workDay={workDay}
                    month={month}
                    year={year}
                    baseRate={baseRate}
                    standardHours={standardHours}
                    shabbatCreditHours={shabbatCreditHoursByDate[workDay.meta.date] ?? 0}
                    isLastInWeek={dayIndex === group.length - 1}
                  />
                ))}
              </TableBody>
            ))}
            <TableFooter>
              <TableRow sx={{ fontWeight: 700 }}>
                <TableCell colSpan={4}>{t("table.total_gross_label")}</TableCell>
                <TableCell>{formatValue(monthBreakdown.actualHours)}</TableCell>
                <TableCell>{formatValue(monthBreakdown.totalHours)}</TableCell>
                <TableCell>{formatValue(monthBreakdown.regular.hours100.hours)}</TableCell>
                <TableCell>{formatValue(monthBreakdown.regular.hours125.hours)}</TableCell>
                <TableCell>{formatValue(monthBreakdown.regular.hours150.hours)}</TableCell>
                <TableCell>{formatValue(monthBreakdown.extra.hours20.hours)}</TableCell>
                <TableCell>{formatValue(monthBreakdown.extra.hours50.hours)}</TableCell>
                <TableCell>{formatValue(monthBreakdown.special.shabbat150.hours)}</TableCell>
                <TableCell>{formatValue(monthBreakdown.special.shabbat200.hours)}</TableCell>
                <TableCell>{formatValue(monthBreakdown.hours100Sick.hours)}</TableCell>
                <TableCell>{formatValue(monthBreakdown.hours100Vacation.hours)}</TableCell>
                <TableCell>{formatValue(monthBreakdown.appliedShabbatCredit.hours)}</TableCell>
                <TableCell>{formatValue(monthBreakdown.perDiemPoints)}</TableCell>
                <TableCell>{formatValue(monthBreakdown.largePoints)}</TableCell>
                <TableCell>{formatValue(monthBreakdown.smallPoints)}</TableCell>
                <TableCell>
                  {dailySalary
                    ? `₪${formatValue(dailySalary)}`
                    : ""}
                </TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </TableContainer>
      </div>
    </>
  );
  },
);
